-- ResearchWithME v3.4 — Wave 10 Migration 9
-- Completes 100% 83/83 Prisma canonical model parity in Supabase SQL + Part VII §3 DB Integrity Constraints:
--   1. v34_source_contributors (SourceContributor)
--   2. v34_citations (Citation)
--   3. v34_contribution_impact_daily (ContributionImpactDaily)
--   4. v34_user_activity_events (UserActivityEvent)
--   5. v34_research_activity_days (ResearchActivityDay)
--   6. v34_mobile_experience_preferences (MobileExperiencePreference)
--   7. v34_mobile_dashboard_module_preferences (MobileDashboardModulePreference)
--   8. v34_pending_mutations (PendingMutation)
--   9. v34_source_topics (SourceTopic — FK-backed)
--  10. v34_contribution_topics (ContributionTopic — FK-backed)
--  11. v34_claim_topics (ClaimTopic — FK-backed)
--  12. v34_tool_topics (ToolTopic — FK-backed)
--  13. Part VII §3 CHECK constraints across ClaimEvidence, UserFollow, GraphEdge, ResearchGoal, CitationCollectionItem, Discussion.

-- ── 1. SourceContributor ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.v34_source_contributors (
  id text PRIMARY KEY,
  source_id text NOT NULL REFERENCES public.v34_sources(id) ON DELETE CASCADE,
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name text NOT NULL,
  orcid text NULL,
  affiliation text NULL,
  role text NOT NULL DEFAULT 'AUTHOR',
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_v34_source_contributors_source ON public.v34_source_contributors(source_id, position);
ALTER TABLE public.v34_source_contributors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS v34_source_contributors_read_all ON public.v34_source_contributors;
CREATE POLICY v34_source_contributors_read_all ON public.v34_source_contributors
  FOR SELECT USING (true);
DROP POLICY IF EXISTS v34_source_contributors_write_auth ON public.v34_source_contributors;
CREATE POLICY v34_source_contributors_write_auth ON public.v34_source_contributors
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── 2. Citation ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.v34_citations (
  id text PRIMARY KEY,
  contribution_version_id text NOT NULL REFERENCES public.v34_contribution_versions(id) ON DELETE CASCADE,
  source_version_id text NOT NULL REFERENCES public.v34_source_versions(id) ON DELETE RESTRICT,
  locator text NULL,
  quote_excerpt text NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_v34_citations_cv ON public.v34_citations(contribution_version_id);
CREATE INDEX IF NOT EXISTS idx_v34_citations_sv ON public.v34_citations(source_version_id);
ALTER TABLE public.v34_citations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS v34_citations_read_all ON public.v34_citations;
CREATE POLICY v34_citations_read_all ON public.v34_citations
  FOR SELECT USING (true);
DROP POLICY IF EXISTS v34_citations_write_auth ON public.v34_citations;
CREATE POLICY v34_citations_write_auth ON public.v34_citations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── 3. ContributionImpactDaily ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.v34_contribution_impact_daily (
  contribution_id text NOT NULL REFERENCES public.v34_contributions(id) ON DELETE CASCADE,
  day date NOT NULL,
  unique_readers integer NOT NULL DEFAULT 0 CHECK (unique_readers >= 0),
  library_saves integer NOT NULL DEFAULT 0 CHECK (library_saves >= 0),
  citation_links integer NOT NULL DEFAULT 0 CHECK (citation_links >= 0),
  replications integer NOT NULL DEFAULT 0 CHECK (replications >= 0),
  PRIMARY KEY (contribution_id, day)
);
ALTER TABLE public.v34_contribution_impact_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS v34_contribution_impact_daily_read_all ON public.v34_contribution_impact_daily;
CREATE POLICY v34_contribution_impact_daily_read_all ON public.v34_contribution_impact_daily
  FOR SELECT USING (true);

-- ── 4. UserActivityEvent ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.v34_user_activity_events (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  workspace_id text NULL REFERENCES public.v34_workspaces(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_v34_user_activity_user_time ON public.v34_user_activity_events(user_id, created_at DESC);
ALTER TABLE public.v34_user_activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS v34_user_activity_own ON public.v34_user_activity_events;
CREATE POLICY v34_user_activity_own ON public.v34_user_activity_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 5. ResearchActivityDay ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.v34_research_activity_days (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date date NOT NULL,
  evidence_extracted integer NOT NULL DEFAULT 0 CHECK (evidence_extracted >= 0),
  claims_evaluated integer NOT NULL DEFAULT 0 CHECK (claims_evaluated >= 0),
  reviews_completed integer NOT NULL DEFAULT 0 CHECK (reviews_completed >= 0),
  drafts_saved integer NOT NULL DEFAULT 0 CHECK (drafts_saved >= 0),
  PRIMARY KEY (user_id, activity_date)
);
ALTER TABLE public.v34_research_activity_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS v34_research_activity_days_own ON public.v34_research_activity_days;
CREATE POLICY v34_research_activity_days_own ON public.v34_research_activity_days
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 6. MobileExperiencePreference ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.v34_mobile_experience_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  density text NOT NULL DEFAULT 'comfortable' CHECK (density IN ('compact', 'comfortable', 'reading')),
  default_sheet_snap text NOT NULL DEFAULT 'half' CHECK (default_sheet_snap IN ('peek', 'half', 'full')),
  offline_public_cache boolean NOT NULL DEFAULT true,
  wipe_drafts_on_logout boolean NOT NULL DEFAULT true,
  quiet_hours_start text NULL,
  quiet_hours_end text NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.v34_mobile_experience_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS v34_mobile_exp_prefs_own ON public.v34_mobile_experience_preferences;
CREATE POLICY v34_mobile_exp_prefs_own ON public.v34_mobile_experience_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 7. MobileDashboardModulePreference ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.v34_mobile_dashboard_module_preferences (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  visible boolean NOT NULL DEFAULT true,
  collapsed_default boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_key)
);
ALTER TABLE public.v34_mobile_dashboard_module_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS v34_mobile_dash_mod_prefs_own ON public.v34_mobile_dashboard_module_preferences;
CREATE POLICY v34_mobile_dash_mod_prefs_own ON public.v34_mobile_dashboard_module_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 8. PendingMutation ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.v34_pending_mutations (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  draft_id text NULL REFERENCES public.v34_drafts(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  operation text NOT NULL,
  base_version integer NOT NULL DEFAULT 0 CHECK (base_version >= 0),
  status text NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'SYNCED', 'CONFLICT', 'DISCARDED')),
  payload_sha256 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz NULL,
  UNIQUE (user_id, idempotency_key)
);
ALTER TABLE public.v34_pending_mutations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS v34_pending_mutations_own ON public.v34_pending_mutations;
CREATE POLICY v34_pending_mutations_own ON public.v34_pending_mutations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 9–12. Explicit FK-backed Topic Junction Tables (Part VII §1 / Part VIII §B) ──
CREATE TABLE IF NOT EXISTS public.v34_source_topics (
  source_id text NOT NULL REFERENCES public.v34_sources(id) ON DELETE CASCADE,
  topic_id text NOT NULL REFERENCES public.v34_topics(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_id, topic_id)
);
ALTER TABLE public.v34_source_topics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS v34_source_topics_read_all ON public.v34_source_topics;
CREATE POLICY v34_source_topics_read_all ON public.v34_source_topics FOR SELECT USING (true);
DROP POLICY IF EXISTS v34_source_topics_write_auth ON public.v34_source_topics;
CREATE POLICY v34_source_topics_write_auth ON public.v34_source_topics FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.v34_contribution_topics (
  contribution_id text NOT NULL REFERENCES public.v34_contributions(id) ON DELETE CASCADE,
  topic_id text NOT NULL REFERENCES public.v34_topics(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (contribution_id, topic_id)
);
ALTER TABLE public.v34_contribution_topics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS v34_contribution_topics_read_all ON public.v34_contribution_topics;
CREATE POLICY v34_contribution_topics_read_all ON public.v34_contribution_topics FOR SELECT USING (true);
DROP POLICY IF EXISTS v34_contribution_topics_write_auth ON public.v34_contribution_topics;
CREATE POLICY v34_contribution_topics_write_auth ON public.v34_contribution_topics FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.v34_claim_topics (
  claim_id text NOT NULL REFERENCES public.v34_claims(id) ON DELETE CASCADE,
  topic_id text NOT NULL REFERENCES public.v34_topics(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (claim_id, topic_id)
);
ALTER TABLE public.v34_claim_topics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS v34_claim_topics_read_all ON public.v34_claim_topics;
CREATE POLICY v34_claim_topics_read_all ON public.v34_claim_topics FOR SELECT USING (true);
DROP POLICY IF EXISTS v34_claim_topics_write_auth ON public.v34_claim_topics;
CREATE POLICY v34_claim_topics_write_auth ON public.v34_claim_topics FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.v34_tool_topics (
  tool_id text NOT NULL REFERENCES public.v34_tool_repositories(id) ON DELETE CASCADE,
  topic_id text NOT NULL REFERENCES public.v34_topics(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tool_id, topic_id)
);
ALTER TABLE public.v34_tool_topics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS v34_tool_topics_read_all ON public.v34_tool_topics;
CREATE POLICY v34_tool_topics_read_all ON public.v34_tool_topics FOR SELECT USING (true);
DROP POLICY IF EXISTS v34_tool_topics_write_auth ON public.v34_tool_topics;
CREATE POLICY v34_tool_topics_write_auth ON public.v34_tool_topics FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── 13. Part VII §3 PostgreSQL Integrity Constraints Beyond Prisma ──────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_v34_claim_evidence_confidence_range') THEN
    ALTER TABLE public.v34_claim_evidence
      ADD CONSTRAINT chk_v34_claim_evidence_confidence_range
      CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_v34_user_follows_no_self') THEN
    ALTER TABLE public.v34_user_follows
      ADD CONSTRAINT chk_v34_user_follows_no_self
      CHECK (follower_id <> followee_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_v34_graph_edges_no_self') THEN
    ALTER TABLE public.v34_graph_edges
      ADD CONSTRAINT chk_v34_graph_edges_no_self
      CHECK (from_node_id <> to_node_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_v34_graph_edges_confidence_range') THEN
    ALTER TABLE public.v34_graph_edges
      ADD CONSTRAINT chk_v34_graph_edges_confidence_range
      CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_v34_research_goals_positive_target') THEN
    ALTER TABLE public.v34_research_goals
      ADD CONSTRAINT chk_v34_research_goals_positive_target
      CHECK (target_value > 0 AND current_value >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_v34_citation_collection_item_single_target') THEN
    ALTER TABLE public.v34_citation_collection_items
      ADD CONSTRAINT chk_v34_citation_collection_item_single_target
      CHECK (
        ((source_id IS NOT NULL)::int + (contribution_id IS NOT NULL)::int + (evidence_id IS NOT NULL)::int) = 1
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_v34_discussions_target_nonempty') THEN
    ALTER TABLE public.v34_discussions
      ADD CONSTRAINT chk_v34_discussions_target_nonempty
      CHECK (length(trim(object_type)) > 0 AND length(trim(object_id)) > 0);
  END IF;
END $$;
