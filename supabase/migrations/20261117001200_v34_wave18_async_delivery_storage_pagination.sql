-- ============================================================================
-- ResearchWithME v3.4 — Wave 18 (P1) Migration 12:
--   1. Durable transactional outbox worker state, dead-letter queue (DLQ),
--      lease claiming (`FOR UPDATE SKIP LOCKED`), and idempotent consumer
--      receipt tracking (`v34_outbox_consumer_receipts`).
--   2. Live SQL reconciliation RPC (`v34_reconcile_integrity_report`) with
--      strict zero-PII / zero-prose reporting.
--   3. Cloudflare R2 signed artifact storage metadata on `v34_scholarly_exports`
--      and `v34_render_jobs`.
--   4. Supabase Realtime publication fan-out on `v34_notifications` and
--      `v34_attention_items` (with RLS-filtered `REPLICA IDENTITY FULL`).
--   5. Canonical composite keyset pagination indexes `(created_at DESC, id DESC)`
--      across all primary v3.4 list tables.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Outbox DLQ, Retry Scheduling & Idempotent Consumer Receipts
-- ----------------------------------------------------------------------------
ALTER TABLE public.v34_outbox_events
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'PROCESSING', 'PUBLISHED', 'DEAD_LETTERED')),
  ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 5
    CHECK (max_attempts >= 1 AND max_attempts <= 20),
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS locked_until timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS dead_lettered_at timestamptz,
  ADD COLUMN IF NOT EXISTS consumer_id text;

CREATE INDEX IF NOT EXISTS idx_v34_outbox_claimable
  ON public.v34_outbox_events (status, next_attempt_at, created_at)
  WHERE status IN ('PENDING', 'PROCESSING');

CREATE INDEX IF NOT EXISTS idx_v34_outbox_dlq
  ON public.v34_outbox_events (dead_lettered_at DESC)
  WHERE status = 'DEAD_LETTERED';

CREATE TABLE IF NOT EXISTS public.v34_outbox_consumer_receipts (
  consumer_name text NOT NULL,
  event_id uuid NOT NULL REFERENCES public.v34_outbox_events(id) ON DELETE CASCADE,
  processed_at timestamptz NOT NULL DEFAULT now(),
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (consumer_name, event_id)
);

ALTER TABLE public.v34_outbox_consumer_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS v34_outbox_consumer_receipts_editor_read ON public.v34_outbox_consumer_receipts;
CREATE POLICY v34_outbox_consumer_receipts_editor_read
  ON public.v34_outbox_consumer_receipts
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.editors e WHERE e.user_id = auth.uid())
  );

DROP POLICY IF EXISTS v34_outbox_consumer_receipts_editor_write ON public.v34_outbox_consumer_receipts;
CREATE POLICY v34_outbox_consumer_receipts_editor_write
  ON public.v34_outbox_consumer_receipts
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.editors e WHERE e.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.editors e WHERE e.user_id = auth.uid())
  );

-- Claim a batch of due outbox events using FOR UPDATE SKIP LOCKED
CREATE OR REPLACE FUNCTION public.v34_claim_outbox_batch(
  p_consumer text,
  p_limit integer DEFAULT 25,
  p_lease_seconds integer DEFAULT 60
)
RETURNS SETOF public.v34_outbox_events
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_limit integer := GREATEST(1, LEAST(COALESCE(p_limit, 25), 100));
  v_lease interval := make_interval(secs => GREATEST(10, LEAST(COALESCE(p_lease_seconds, 60), 600)));
BEGIN
  RETURN QUERY
  WITH candidate AS (
    SELECT e.id
    FROM public.v34_outbox_events e
    WHERE (
        (e.status = 'PENDING' AND e.next_attempt_at <= now())
        OR (e.status = 'PROCESSING' AND e.locked_until IS NOT NULL AND e.locked_until < now())
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.v34_outbox_consumer_receipts r
        WHERE r.consumer_name = p_consumer
          AND r.event_id = e.id
      )
    ORDER BY e.created_at ASC
    LIMIT v_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.v34_outbox_events o
  SET status = 'PROCESSING',
      locked_until = now() + v_lease,
      consumer_id = p_consumer,
      attempts = o.attempts + 1
  FROM candidate
  WHERE o.id = candidate.id
  RETURNING o.*;
END;
$$;

-- Idempotent ACK: records consumer receipt and marks event PUBLISHED
CREATE OR REPLACE FUNCTION public.v34_ack_outbox_event(
  p_event_id uuid,
  p_consumer text,
  p_result jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_inserted integer := 0;
BEGIN
  INSERT INTO public.v34_outbox_consumer_receipts (consumer_name, event_id, processed_at, result)
  VALUES (p_consumer, p_event_id, now(), COALESCE(p_result, '{}'::jsonb))
  ON CONFLICT (consumer_name, event_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  UPDATE public.v34_outbox_events
  SET status = 'PUBLISHED',
      published_at = COALESCE(published_at, now()),
      locked_until = NULL,
      last_error = NULL
  WHERE id = p_event_id;

  RETURN v_inserted > 0;
END;
$$;

-- NACK with exponential backoff and automatic DEAD_LETTERED transition
CREATE OR REPLACE FUNCTION public.v34_nack_outbox_event(
  p_event_id uuid,
  p_error text,
  p_backoff_seconds integer DEFAULT 30
)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_attempts integer;
  v_max integer;
  v_new_status text;
  v_delay integer;
BEGIN
  SELECT attempts, max_attempts
  INTO v_attempts, v_max
  FROM public.v34_outbox_events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'NOT_FOUND';
  END IF;

  IF v_attempts >= v_max THEN
    v_new_status := 'DEAD_LETTERED';
    UPDATE public.v34_outbox_events
    SET status = 'DEAD_LETTERED',
        dead_lettered_at = now(),
        locked_until = NULL,
        last_error = LEFT(COALESCE(p_error, 'UNKNOWN_ERROR'), 500)
    WHERE id = p_event_id;
  ELSE
    v_new_status := 'PENDING';
    v_delay := LEAST(3600, GREATEST(5, COALESCE(p_backoff_seconds, 30) * POWER(2, GREATEST(0, v_attempts - 1))::integer));
    UPDATE public.v34_outbox_events
    SET status = 'PENDING',
        next_attempt_at = now() + make_interval(secs => v_delay),
        locked_until = NULL,
        last_error = LEFT(COALESCE(p_error, 'UNKNOWN_ERROR'), 500)
    WHERE id = p_event_id;
  END IF;

  RETURN v_new_status;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. Live SQL Backfill & Reconciliation Report RPC (Zero PII / Zero Prose)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.v34_reconcile_integrity_report()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_orphan_claim_evidence integer := 0;
  v_orphan_contrib_evidence integer := 0;
  v_orphan_contrib_claims integer := 0;
  v_orphan_evidence_sources integer := 0;
  v_invalid_export_checksums integer := 0;
  v_invalid_render_checksums integer := 0;
  v_open_quarantined integer := 0;
  v_pending_outbox integer := 0;
  v_dead_letter_outbox integer := 0;
  v_counts jsonb;
BEGIN
  SELECT count(*) INTO v_orphan_claim_evidence
  FROM public.v34_claim_evidence ce
  LEFT JOIN public.v34_claims c ON c.id = ce.claim_id
  LEFT JOIN public.v34_evidence e ON e.id = ce.evidence_id
  WHERE c.id IS NULL OR e.id IS NULL;

  SELECT count(*) INTO v_orphan_contrib_evidence
  FROM public.v34_contribution_evidence ce
  LEFT JOIN public.v34_contributions co ON co.id = ce.contribution_id
  LEFT JOIN public.v34_evidence e ON e.id = ce.evidence_id
  WHERE co.id IS NULL OR e.id IS NULL;

  SELECT count(*) INTO v_orphan_contrib_claims
  FROM public.v34_contribution_claims cc
  LEFT JOIN public.v34_contributions co ON co.id = cc.contribution_id
  LEFT JOIN public.v34_claims c ON c.id = cc.claim_id
  WHERE co.id IS NULL OR c.id IS NULL;

  SELECT count(*) INTO v_orphan_evidence_sources
  FROM public.v34_evidence e
  LEFT JOIN public.v34_sources s ON s.id = e.source_id
  WHERE s.id IS NULL;

  SELECT count(*) INTO v_invalid_export_checksums
  FROM public.v34_scholarly_exports
  WHERE checksum_sha256 IS NULL OR checksum_sha256 !~ '^[0-9a-f]{64}$';

  SELECT count(*) INTO v_invalid_render_checksums
  FROM public.v34_render_jobs
  WHERE input_checksum_sha256 IS NULL OR input_checksum_sha256 !~ '^[0-9a-f]{64}$';

  SELECT count(*) INTO v_open_quarantined
  FROM public.v34_quarantined_relationships
  WHERE resolution_status = 'OPEN';

  SELECT count(*) INTO v_pending_outbox
  FROM public.v34_outbox_events
  WHERE status IN ('PENDING', 'PROCESSING');

  SELECT count(*) INTO v_dead_letter_outbox
  FROM public.v34_outbox_events
  WHERE status = 'DEAD_LETTERED';

  v_counts := jsonb_build_object(
    'sources', (SELECT count(*) FROM public.v34_sources),
    'evidence', (SELECT count(*) FROM public.v34_evidence),
    'claims', (SELECT count(*) FROM public.v34_claims),
    'contributions', (SELECT count(*) FROM public.v34_contributions),
    'tools', (SELECT count(*) FROM public.v34_tool_repositories),
    'workspaces', (SELECT count(*) FROM public.v34_workspaces),
    'projects', (SELECT count(*) FROM public.v34_projects),
    'reviews', (SELECT count(*) FROM public.v34_reviews),
    'exports', (SELECT count(*) FROM public.v34_scholarly_exports),
    'renderJobs', (SELECT count(*) FROM public.v34_render_jobs),
    'outboxEvents', (SELECT count(*) FROM public.v34_outbox_events),
    'outboxReceipts', (SELECT count(*) FROM public.v34_outbox_consumer_receipts),
    'legacyPosts', (SELECT count(*) FROM public.posts)
  );

  RETURN jsonb_build_object(
    'checkedAt', now(),
    'status', CASE
      WHEN v_orphan_claim_evidence = 0
        AND v_orphan_contrib_evidence = 0
        AND v_orphan_contrib_claims = 0
        AND v_orphan_evidence_sources = 0
        AND v_invalid_export_checksums = 0
        AND v_invalid_render_checksums = 0
      THEN 'RECONCILED'
      ELSE 'DRIFT_DETECTED'
    END,
    'orphans', jsonb_build_object(
      'claimEvidence', v_orphan_claim_evidence,
      'contributionEvidence', v_orphan_contrib_evidence,
      'contributionClaims', v_orphan_contrib_claims,
      'evidenceSources', v_orphan_evidence_sources
    ),
    'checksumIntegrity', jsonb_build_object(
      'invalidExportChecksums', v_invalid_export_checksums,
      'invalidRenderChecksums', v_invalid_render_checksums
    ),
    'quarantinedOpen', v_open_quarantined,
    'outbox', jsonb_build_object(
      'pending', v_pending_outbox,
      'deadLettered', v_dead_letter_outbox
    ),
    'rowCounts', v_counts
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. Cloudflare R2 Signed Storage Metadata on Exports & Render Jobs
-- ----------------------------------------------------------------------------
ALTER TABLE public.v34_scholarly_exports
  ADD COLUMN IF NOT EXISTS storage_provider text NOT NULL DEFAULT 'inline'
    CHECK (storage_provider IN ('inline', 'r2')),
  ADD COLUMN IF NOT EXISTS storage_bucket text,
  ADD COLUMN IF NOT EXISTS storage_key text,
  ADD COLUMN IF NOT EXISTS signed_url_expires_at timestamptz;

ALTER TABLE public.v34_render_jobs
  ADD COLUMN IF NOT EXISTS storage_provider text NOT NULL DEFAULT 'inline'
    CHECK (storage_provider IN ('inline', 'r2')),
  ADD COLUMN IF NOT EXISTS storage_bucket text,
  ADD COLUMN IF NOT EXISTS storage_key text,
  ADD COLUMN IF NOT EXISTS signed_url_expires_at timestamptz;

-- ----------------------------------------------------------------------------
-- 4. Supabase Realtime Publication for Private Notifications & Attention
-- ----------------------------------------------------------------------------
ALTER TABLE public.v34_notifications REPLICA IDENTITY FULL;
ALTER TABLE public.v34_attention_items REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'v34_notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.v34_notifications;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'v34_attention_items'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.v34_attention_items;
    END IF;
  END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- 5. Canonical Keyset Cursor Pagination Composite Indexes (created_at DESC, id DESC)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_v34_contributions_cursor ON public.v34_contributions (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_v34_sources_cursor ON public.v34_sources (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_v34_evidence_cursor ON public.v34_evidence (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_v34_claims_cursor ON public.v34_claims (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_v34_tools_cursor ON public.v34_tool_repositories (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_v34_projects_cursor ON public.v34_projects (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_v34_workspaces_cursor ON public.v34_workspaces (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_v34_reviews_cursor ON public.v34_reviews (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_v34_notifications_cursor ON public.v34_notifications (user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_v34_attention_cursor ON public.v34_attention_items (user_id, created_at DESC, id DESC);
