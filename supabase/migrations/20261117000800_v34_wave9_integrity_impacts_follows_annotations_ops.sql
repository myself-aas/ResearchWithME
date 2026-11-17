-- ============================================================================
-- ResearchWithME v3.4 — Migration 8 (Wave 9):
-- Integrity Impact Propagation Ledger, Source-Anchored Annotations,
-- Explicit Follow Tables (No Self-Follow), Profile Metrics Cache,
-- Search Alerts, Notification & Webhook Deliveries, External Identifiers,
-- and Legacy Relationship Quarantine (Part V §18, Part VII §1–§6, Part VIII).
-- ============================================================================

-- 1. Propagated Integrity Impact Records (Retraction / Correction / Concern)
CREATE TABLE IF NOT EXISTS public.v34_integrity_impact_records (
  id text PRIMARY KEY,
  integrity_event_id text NOT NULL REFERENCES public.v34_integrity_events(id) ON DELETE CASCADE,
  source_id text NOT NULL REFERENCES public.v34_sources(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('evidence', 'claim', 'draft', 'review', 'contribution')),
  target_id text NOT NULL,
  impact_status text NOT NULL DEFAULT 'PENDING_REVIEW'
    CHECK (impact_status IN ('PENDING_REVIEW', 'ACKNOWLEDGED', 'RESOLVED', 'WAIVED')),
  severity text NOT NULL DEFAULT 'HIGH' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  rationale text,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (integrity_event_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_v34_integrity_impacts_target
  ON public.v34_integrity_impact_records (target_type, target_id, impact_status);

-- 2. Source-Anchored Annotations (No silent relocation — Part VII §6 & RES-1)
CREATE TABLE IF NOT EXISTS public.v34_annotations (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id text REFERENCES public.v34_workspaces(id) ON DELETE SET NULL,
  source_id text NOT NULL REFERENCES public.v34_sources(id) ON DELETE CASCADE,
  source_version_id text NOT NULL REFERENCES public.v34_source_versions(id) ON DELETE CASCADE,
  locator_kind text NOT NULL DEFAULT 'quote',
  locator_value text NOT NULL,
  quote_exact text NOT NULL,
  quote_prefix text NOT NULL DEFAULT '',
  quote_suffix text NOT NULL DEFAULT '',
  body text NOT NULL,
  anchor_status text NOT NULL DEFAULT 'VALID'
    CHECK (anchor_status IN ('VALID', 'DRIFTED', 'ORPHANED')),
  revalidated_at timestamptz,
  visibility text NOT NULL DEFAULT 'PRIVATE'
    CHECK (visibility IN ('PRIVATE', 'WORKSPACE', 'PUBLIC')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v34_annotations_source_ver
  ON public.v34_annotations (source_version_id, user_id);

-- 3. Cached Non-Vanity Profile Metrics (Part VII §1 & §5 W2)
CREATE TABLE IF NOT EXISTS public.v34_profile_metrics (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  published_contributions integer NOT NULL DEFAULT 0 CHECK (published_contributions >= 0),
  verified_evidence_count integer NOT NULL DEFAULT 0 CHECK (verified_evidence_count >= 0),
  completed_reviews_count integer NOT NULL DEFAULT 0 CHECK (completed_reviews_count >= 0),
  curated_sources_count integer NOT NULL DEFAULT 0 CHECK (curated_sources_count >= 0),
  replications_count integer NOT NULL DEFAULT 0 CHECK (replications_count >= 0),
  computed_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Explicit FK-Backed Follow Tables (Part VII §1 & §3 — No Self-Follow)
CREATE TABLE IF NOT EXISTS public.v34_user_follows (
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);

CREATE TABLE IF NOT EXISTS public.v34_tool_follows (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_id text NOT NULL REFERENCES public.v34_tool_repositories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tool_id)
);

CREATE TABLE IF NOT EXISTS public.v34_project_follows (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id text NOT NULL REFERENCES public.v34_projects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, project_id)
);

-- 5. Saved Search Alert Deliveries (Part VII §1 & §8)
CREATE TABLE IF NOT EXISTS public.v34_search_alerts (
  id text PRIMARY KEY,
  saved_search_id text NOT NULL REFERENCES public.v34_saved_searches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  matched_count integer NOT NULL DEFAULT 0 CHECK (matched_count >= 0),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'DELIVERED', 'FAILED', 'SKIPPED')),
  dispatched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Notification Delivery Ledger (Short Operational Retention — Part V §12 & §17)
CREATE TABLE IF NOT EXISTS public.v34_notification_deliveries (
  id text PRIMARY KEY,
  notification_id text NOT NULL REFERENCES public.v34_notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('IN_APP', 'WEB_PUSH', 'EMAIL_DIGEST')),
  delivery_status text NOT NULL DEFAULT 'QUEUED' CHECK (delivery_status IN ('QUEUED', 'SENT', 'FAILED', 'SUPPRESSED')),
  safe_preview_applied boolean NOT NULL DEFAULT true,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Idempotent Webhook Deliveries (Part VII §1)
CREATE TABLE IF NOT EXISTS public.v34_webhook_deliveries (
  id text PRIMARY KEY,
  provider text NOT NULL,
  event_type text NOT NULL,
  delivery_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED')),
  http_status integer,
  payload_sha256 text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

-- 8. Normalized External Identifiers Index (Part V §18.9)
CREATE TABLE IF NOT EXISTS public.v34_external_identifiers (
  id text PRIMARY KEY,
  entity_type text NOT NULL CHECK (entity_type IN ('source', 'contribution', 'tool', 'profile', 'affiliation')),
  entity_id text NOT NULL,
  scheme text NOT NULL CHECK (scheme IN ('doi', 'arxiv', 'pmid', 'pmcid', 'orcid', 'ror', 'rrid', 'isbn', 'issn', 'accession', 'url', 'github')),
  normalized_value text NOT NULL,
  raw_value text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scheme, normalized_value, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_v34_ext_id_lookup
  ON public.v34_external_identifiers (scheme, normalized_value);

-- 9. Legacy Relationship Quarantine (Part VII §6 & Part VIII §A)
CREATE TABLE IF NOT EXISTS public.v34_quarantined_relationships (
  id text PRIMARY KEY,
  legacy_relationship_id text NOT NULL UNIQUE,
  source_kind text NOT NULL,
  source_id text NOT NULL,
  target_kind text NOT NULL,
  target_id text NOT NULL,
  legacy_relation_type text NOT NULL,
  quarantine_reason text NOT NULL,
  triaged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_status text NOT NULL DEFAULT 'QUARANTINED'
    CHECK (resolution_status IN ('QUARANTINED', 'MAPPED', 'ARCHIVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- Enable Row-Level Security on ALL 11 Migration 8 tables
-- ============================================================================
ALTER TABLE public.v34_integrity_impact_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_profile_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_tool_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_project_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_search_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_external_identifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_quarantined_relationships ENABLE ROW LEVEL SECURITY;

-- Integrity impact records: public read for published transparency; authenticated updates
DROP POLICY IF EXISTS v34_integrity_impacts_read ON public.v34_integrity_impact_records;
CREATE POLICY v34_integrity_impacts_read ON public.v34_integrity_impact_records
  FOR SELECT USING (true);
DROP POLICY IF EXISTS v34_integrity_impacts_write ON public.v34_integrity_impact_records;
CREATE POLICY v34_integrity_impacts_write ON public.v34_integrity_impact_records
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Annotations: owner-scoped or public
DROP POLICY IF EXISTS v34_annotations_select ON public.v34_annotations;
CREATE POLICY v34_annotations_select ON public.v34_annotations
  FOR SELECT USING (visibility = 'PUBLIC' OR user_id = auth.uid());
DROP POLICY IF EXISTS v34_annotations_owner ON public.v34_annotations;
CREATE POLICY v34_annotations_owner ON public.v34_annotations
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Profile metrics: public read, self update
DROP POLICY IF EXISTS v34_profile_metrics_read ON public.v34_profile_metrics;
CREATE POLICY v34_profile_metrics_read ON public.v34_profile_metrics
  FOR SELECT USING (true);
DROP POLICY IF EXISTS v34_profile_metrics_owner ON public.v34_profile_metrics;
CREATE POLICY v34_profile_metrics_owner ON public.v34_profile_metrics
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Explicit follow tables: self-managed
DROP POLICY IF EXISTS v34_user_follows_read ON public.v34_user_follows;
CREATE POLICY v34_user_follows_read ON public.v34_user_follows
  FOR SELECT USING (true);
DROP POLICY IF EXISTS v34_user_follows_owner ON public.v34_user_follows;
CREATE POLICY v34_user_follows_owner ON public.v34_user_follows
  FOR ALL USING (follower_id = auth.uid()) WITH CHECK (follower_id = auth.uid());

DROP POLICY IF EXISTS v34_tool_follows_read ON public.v34_tool_follows;
CREATE POLICY v34_tool_follows_read ON public.v34_tool_follows
  FOR SELECT USING (true);
DROP POLICY IF EXISTS v34_tool_follows_owner ON public.v34_tool_follows;
CREATE POLICY v34_tool_follows_owner ON public.v34_tool_follows
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS v34_project_follows_read ON public.v34_project_follows;
CREATE POLICY v34_project_follows_read ON public.v34_project_follows
  FOR SELECT USING (true);
DROP POLICY IF EXISTS v34_project_follows_owner ON public.v34_project_follows;
CREATE POLICY v34_project_follows_owner ON public.v34_project_follows
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Search alerts & notification deliveries: strictly private to recipient
DROP POLICY IF EXISTS v34_search_alerts_owner ON public.v34_search_alerts;
CREATE POLICY v34_search_alerts_owner ON public.v34_search_alerts
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS v34_notification_deliveries_owner ON public.v34_notification_deliveries;
CREATE POLICY v34_notification_deliveries_owner ON public.v34_notification_deliveries
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Webhook deliveries: fail closed to public; authenticated service/editor only
DROP POLICY IF EXISTS v34_webhook_deliveries_auth ON public.v34_webhook_deliveries;
CREATE POLICY v34_webhook_deliveries_auth ON public.v34_webhook_deliveries
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- External identifiers: public scholarly read, authenticated write
DROP POLICY IF EXISTS v34_external_identifiers_read ON public.v34_external_identifiers;
CREATE POLICY v34_external_identifiers_read ON public.v34_external_identifiers
  FOR SELECT USING (true);
DROP POLICY IF EXISTS v34_external_identifiers_write ON public.v34_external_identifiers;
CREATE POLICY v34_external_identifiers_write ON public.v34_external_identifiers
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Quarantined relationships: authenticated governance triage only
DROP POLICY IF EXISTS v34_quarantined_rel_auth ON public.v34_quarantined_relationships;
CREATE POLICY v34_quarantined_rel_auth ON public.v34_quarantined_relationships
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
