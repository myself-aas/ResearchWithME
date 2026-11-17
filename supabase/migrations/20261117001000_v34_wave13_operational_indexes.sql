-- ResearchWithME v3.4 — Wave 13 Operational & Foreign-Key Index Hardening
-- Adds high-selectivity B-tree indexes across canonical join tables,
-- integrity propagation paths, drafts, goals, deliveries, and idempotency cleanup.

BEGIN;

-- Reverse FK indexes for sub-5-minute retraction & integrity propagation (Part V §13.3)
CREATE INDEX IF NOT EXISTS idx_v34_claim_evidence_evidence_id
  ON public.v34_claim_evidence (evidence_id, status);

CREATE INDEX IF NOT EXISTS idx_v34_contribution_evidence_evidence_id
  ON public.v34_contribution_evidence (evidence_id);

CREATE INDEX IF NOT EXISTS idx_v34_contribution_claims_claim_id
  ON public.v34_contribution_claims (claim_id);

CREATE INDEX IF NOT EXISTS idx_v34_integrity_events_source_recorded
  ON public.v34_integrity_events (source_id, recorded_at DESC);

-- Author drafts & Continue Working hot-path index (Part I §26.4)
CREATE INDEX IF NOT EXISTS idx_v34_drafts_author_updated
  ON public.v34_drafts (author_id, updated_at DESC);

-- Idempotency cleanup & lookup index (Part V §5.4 / §17)
CREATE INDEX IF NOT EXISTS idx_v34_idempotency_keys_draft_created
  ON public.v34_idempotency_keys (draft_id, created_at DESC);

-- Personal Research Goals active-list index (Part VI §12)
CREATE INDEX IF NOT EXISTS idx_v34_research_goals_user_status
  ON public.v34_research_goals (user_id, status, updated_at DESC);

-- Notification deliveries status & user audit index (Part V §12)
CREATE INDEX IF NOT EXISTS idx_v34_notification_deliveries_user_status
  ON public.v34_notification_deliveries (user_id, delivery_status, created_at DESC);

-- Project object graph membership index (Part VI §7)
CREATE INDEX IF NOT EXISTS idx_v34_project_objects_type_object
  ON public.v34_project_objects (object_type, object_id);

-- Topic taxonomy reverse-lookup indexes (Part VI §2 / ADR-032-08)
CREATE INDEX IF NOT EXISTS idx_v34_source_topics_topic_id
  ON public.v34_source_topics (topic_id);

CREATE INDEX IF NOT EXISTS idx_v34_contribution_topics_topic_id
  ON public.v34_contribution_topics (topic_id);

CREATE INDEX IF NOT EXISTS idx_v34_claim_topics_topic_id
  ON public.v34_claim_topics (topic_id);

-- Software repository -> primary source reverse lookup (Part VI §8)
CREATE INDEX IF NOT EXISTS idx_v34_tool_source_links_source_id
  ON public.v34_tool_source_links (source_id);

COMMIT;
