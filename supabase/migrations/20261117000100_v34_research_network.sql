-- ResearchWithME v3.4 Wave 1 Canonical Research Network Schema (PostgreSQL 15+ / Supabase)
-- Strategy: additive expand migration compatible with existing public.posts/profiles/editors.
-- Invariants enforced per ResearchWithME-v3.4-acceptance-criteria.md:
--   - Lock budget <= 5s; fully idempotent DDL.
--   - Explicit ClaimEvidence (SUPPORTS, CONTRADICTS, QUALIFIES) — no generic KnowledgeRelationship.
--   - Contributions link to canonical Evidence and Claims via join tables without owning/deleting them.
--   - ToolRepository is global & deduplicated; citable software releases link via ToolSourceLink.
--   - Evidence always references SourceVersion + structured locator JSONB.
--   - Optimistic concurrency (version) + idempotent autosave keys on drafts.

BEGIN;
SET LOCAL lock_timeout = '5s';

-- -----------------------------------------------------------------------------
-- 1. ENUMS (idempotent)
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.v34_contribution_type AS ENUM (
    'paper-review',
    'tool-review',
    'perspective',
    'research-note',
    'dataset-review',
    'replication-report',
    'research-question',
    'literature-summary',
    'method-review',
    'implementation-note'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.v34_lifecycle_state AS ENUM (
    'draft',
    'active',
    'under-review',
    'validated',
    'published',
    'superseded',
    'withdrawn',
    'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.v34_data_classification AS ENUM (
    'public',
    'workspace',
    'confidential',
    'restricted',
    'embargoed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.v34_source_integrity_status AS ENUM (
    'active',
    'corrected',
    'expression-of-concern',
    'retracted',
    'withdrawn'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.v34_claim_evidence_type AS ENUM (
    'SUPPORTS',
    'CONTRADICTS',
    'QUALIFIES'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.v34_topic_relation_type AS ENUM (
    'BROADER_THAN',
    'NARROWER_THAN',
    'RELATED_TO',
    'EQUIVALENT_TO'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.v34_research_goal_metric AS ENUM (
    'SOURCES_REVIEWED',
    'CONTRIBUTIONS_PUBLISHED',
    'REVIEWS_COMPLETED',
    'EVIDENCE_ATTACHED',
    'CITATIONS_RESOLVED',
    'MILESTONES_COMPLETED',
    'REPLICATIONS_DOCUMENTED',
    'CUSTOM'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.v34_research_goal_period AS ENUM (
    'ONE_TIME',
    'WEEKLY',
    'MONTHLY',
    'QUARTERLY',
    'CUSTOM'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.v34_research_goal_status AS ENUM (
    'ACTIVE',
    'PAUSED',
    'COMPLETED',
    'EXPIRED',
    'ARCHIVED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.v34_recognition_kind AS ENUM (
    'helpful_review',
    'referenced',
    'saved',
    'evidence_used',
    'validated_insight',
    'replication_documented'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 2. TOPICS & RELATIONSHIPS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.v34_topics (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  language text NOT NULL DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.v34_topic_relationships (
  source_topic_id text NOT NULL REFERENCES public.v34_topics(id) ON DELETE CASCADE,
  target_topic_id text NOT NULL REFERENCES public.v34_topics(id) ON DELETE CASCADE,
  relation_type public.v34_topic_relation_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_topic_id, target_topic_id, relation_type),
  CHECK (source_topic_id <> target_topic_id)
);

-- -----------------------------------------------------------------------------
-- 3. CANONICAL SOURCES, VERSIONS, INTEGRITY EVENTS & GLOBAL TOOL REPOSITORIES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.v34_sources (
  id text PRIMARY KEY,
  source_type text NOT NULL CHECK (source_type IN ('paper', 'preprint', 'software', 'dataset', 'protocol', 'webpage', 'book', 'report')),
  title text NOT NULL,
  authors jsonb NOT NULL DEFAULT '[]'::jsonb,
  published_date text,
  venue text,
  canonical_url text,
  identifier_scheme text CHECK (identifier_scheme IN ('doi', 'arxiv', 'pmid', 'isbn', 'swhid', 'url', 'github')),
  identifier_value text,
  access_state text NOT NULL DEFAULT 'open' CHECK (access_state IN ('open', 'subscription', 'restricted', 'unknown')),
  integrity_status public.v34_source_integrity_status NOT NULL DEFAULT 'active',
  language text NOT NULL DEFAULT 'en',
  classification public.v34_data_classification NOT NULL DEFAULT 'public',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_v34_sources_identifier
  ON public.v34_sources(identifier_scheme, identifier_value)
  WHERE identifier_scheme IS NOT NULL AND identifier_value IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.v34_source_versions (
  id text PRIMARY KEY,
  source_id text NOT NULL REFERENCES public.v34_sources(id) ON DELETE CASCADE,
  version_label text NOT NULL DEFAULT 'v1',
  retrieved_at timestamptz NOT NULL DEFAULT now(),
  content_hash text,
  snapshot_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, version_label)
);

CREATE TABLE IF NOT EXISTS public.v34_integrity_events (
  id text PRIMARY KEY,
  source_id text NOT NULL REFERENCES public.v34_sources(id) ON DELETE CASCADE,
  source_version_id text REFERENCES public.v34_source_versions(id) ON DELETE SET NULL,
  status public.v34_source_integrity_status NOT NULL,
  summary text NOT NULL,
  notice_url text,
  disposition text NOT NULL DEFAULT 'open' CHECK (disposition IN ('open', 'acknowledged', 'publication-blocked', 'resolved')),
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.v34_tool_repositories (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  repository_url text NOT NULL UNIQUE,
  license text,
  primary_language text,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.v34_tool_source_links (
  tool_repository_id text NOT NULL REFERENCES public.v34_tool_repositories(id) ON DELETE CASCADE,
  source_id text NOT NULL REFERENCES public.v34_sources(id) ON DELETE CASCADE,
  release_tag text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tool_repository_id, source_id)
);

-- -----------------------------------------------------------------------------
-- 4. CONTRIBUTIONS, EVIDENCE, CLAIMS & EXPLICIT RELATIONSHIPS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.v34_contributions (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_handle text NOT NULL,
  author_name text NOT NULL,
  contribution_type public.v34_contribution_type NOT NULL,
  title text NOT NULL,
  subtitle text,
  summary text NOT NULL,
  document jsonb NOT NULL,
  mdx text NOT NULL DEFAULT '',
  primary_source_id text REFERENCES public.v34_sources(id) ON DELETE SET NULL,
  primary_source_version_id text REFERENCES public.v34_source_versions(id) ON DELETE SET NULL,
  topics text[] NOT NULL DEFAULT '{}'::text[],
  tags text[] NOT NULL DEFAULT '{}'::text[],
  limitations text[] NOT NULL DEFAULT '{}'::text[],
  trust_assessment jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_provenance jsonb,
  lifecycle public.v34_lifecycle_state NOT NULL DEFAULT 'draft',
  classification public.v34_data_classification NOT NULL DEFAULT 'public',
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v34_contributions_feed
  ON public.v34_contributions(lifecycle, contribution_type, published_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_v34_contributions_author
  ON public.v34_contributions(author_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.v34_evidence (
  id text PRIMARY KEY,
  source_id text NOT NULL REFERENCES public.v34_sources(id) ON DELETE RESTRICT,
  source_version_id text NOT NULL REFERENCES public.v34_source_versions(id) ON DELETE RESTRICT,
  statement text NOT NULL,
  quote text,
  locator jsonb NOT NULL,
  extraction_type text NOT NULL CHECK (extraction_type IN ('direct-quote', 'paraphrase', 'quantitative', 'table-figure', 'code-artifact', 'inferred')),
  limitation text,
  assessment jsonb NOT NULL,
  ai_provenance jsonb,
  classification public.v34_data_classification NOT NULL DEFAULT 'public',
  object_version integer NOT NULL DEFAULT 1 CHECK (object_version > 0),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (extraction_type <> 'inferred' OR (limitation IS NOT NULL AND length(trim(limitation)) > 0))
);

CREATE INDEX IF NOT EXISTS idx_v34_evidence_source
  ON public.v34_evidence(source_id, source_version_id);

CREATE TABLE IF NOT EXISTS public.v34_claims (
  id text PRIMARY KEY,
  claim_type text NOT NULL CHECK (claim_type IN ('empirical', 'methodological', 'causal', 'comparative', 'normative', 'replication')),
  statement text NOT NULL,
  lifecycle public.v34_lifecycle_state NOT NULL DEFAULT 'active',
  assessment jsonb NOT NULL,
  classification public.v34_data_classification NOT NULL DEFAULT 'public',
  object_version integer NOT NULL DEFAULT 1 CHECK (object_version > 0),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.v34_claim_evidence (
  claim_id text NOT NULL REFERENCES public.v34_claims(id) ON DELETE CASCADE,
  evidence_id text NOT NULL REFERENCES public.v34_evidence(id) ON DELETE CASCADE,
  relationship public.v34_claim_evidence_type NOT NULL,
  asserted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assertion_method text NOT NULL DEFAULT 'MANUAL' CHECK (assertion_method IN ('MANUAL', 'AI_SUGGESTED', 'IMPORTED')),
  confidence numeric(5,4) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  rationale text,
  status text NOT NULL DEFAULT 'ACCEPTED' CHECK (status IN ('PROPOSED', 'ACCEPTED', 'REJECTED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (claim_id, evidence_id, relationship)
);

CREATE TABLE IF NOT EXISTS public.v34_contribution_evidence (
  contribution_id text NOT NULL REFERENCES public.v34_contributions(id) ON DELETE CASCADE,
  evidence_id text NOT NULL REFERENCES public.v34_evidence(id) ON DELETE RESTRICT,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (contribution_id, evidence_id)
);

CREATE TABLE IF NOT EXISTS public.v34_contribution_claims (
  contribution_id text NOT NULL REFERENCES public.v34_contributions(id) ON DELETE CASCADE,
  claim_id text NOT NULL REFERENCES public.v34_claims(id) ON DELETE RESTRICT,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (contribution_id, claim_id)
);

-- -----------------------------------------------------------------------------
-- 5. DRAFTS, VERSION SNAPSHOTS & IDEMPOTENCY KEYS (3-LAYER AUTOSAVE)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.v34_drafts (
  id text PRIMARY KEY,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contribution_id text REFERENCES public.v34_contributions(id) ON DELETE SET NULL,
  contribution_type public.v34_contribution_type NOT NULL DEFAULT 'perspective',
  title text NOT NULL DEFAULT '',
  document jsonb NOT NULL,
  mdx text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  last_mutation_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.v34_draft_snapshots (
  id text PRIMARY KEY,
  draft_id text NOT NULL REFERENCES public.v34_drafts(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  document jsonb NOT NULL,
  reason text NOT NULL CHECK (reason IN ('interval', 'manual', 'pre-publish', 'conflict')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v34_draft_snapshots_draft
  ON public.v34_draft_snapshots(draft_id, version DESC);

CREATE TABLE IF NOT EXISTS public.v34_idempotency_keys (
  mutation_id text PRIMARY KEY,
  draft_id text NOT NULL REFERENCES public.v34_drafts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resulting_version integer NOT NULL,
  response_payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 6. PERSONAL RESEARCH LIBRARY, GOALS & SCHOLARLY RECOGNITION
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.v34_library_items (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('contribution', 'article', 'source', 'evidence', 'claim', 'tool')),
  item_id text NOT NULL,
  title text NOT NULL,
  url text NOT NULL,
  collection text NOT NULL DEFAULT 'Saved',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_type, item_id)
);

CREATE TABLE IF NOT EXISTS public.v34_research_goals (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  metric public.v34_research_goal_metric NOT NULL,
  target_value integer NOT NULL CHECK (target_value > 0),
  current_value integer NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  period public.v34_research_goal_period NOT NULL DEFAULT 'WEEKLY',
  status public.v34_research_goal_status NOT NULL DEFAULT 'ACTIVE',
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.v34_recognition_signals (
  id text PRIMARY KEY,
  contribution_id text NOT NULL REFERENCES public.v34_contributions(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.v34_recognition_kind NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contribution_id, actor_id, kind)
);

-- -----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (zero service-role key required in runtime)
-- -----------------------------------------------------------------------------
ALTER TABLE public.v34_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_topic_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_source_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_integrity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_tool_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_tool_source_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_claim_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_contribution_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_contribution_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_draft_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_library_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_research_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_recognition_signals ENABLE ROW LEVEL SECURITY;

-- Public read policies for published/public scholarly objects
DROP POLICY IF EXISTS v34_topics_public_read ON public.v34_topics;
CREATE POLICY v34_topics_public_read ON public.v34_topics FOR SELECT USING (true);

DROP POLICY IF EXISTS v34_sources_public_read ON public.v34_sources;
CREATE POLICY v34_sources_public_read ON public.v34_sources FOR SELECT
  USING (classification = 'public' OR created_by = auth.uid() OR public.is_editor());

DROP POLICY IF EXISTS v34_sources_auth_insert ON public.v34_sources;
CREATE POLICY v34_sources_auth_insert ON public.v34_sources FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (created_by IS NULL OR created_by = auth.uid()));

DROP POLICY IF EXISTS v34_source_versions_public_read ON public.v34_source_versions;
CREATE POLICY v34_source_versions_public_read ON public.v34_source_versions FOR SELECT USING (true);

DROP POLICY IF EXISTS v34_source_versions_auth_insert ON public.v34_source_versions;
CREATE POLICY v34_source_versions_auth_insert ON public.v34_source_versions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS v34_integrity_events_public_read ON public.v34_integrity_events;
CREATE POLICY v34_integrity_events_public_read ON public.v34_integrity_events FOR SELECT USING (true);

DROP POLICY IF EXISTS v34_integrity_events_editor_insert ON public.v34_integrity_events;
CREATE POLICY v34_integrity_events_editor_insert ON public.v34_integrity_events FOR INSERT
  WITH CHECK (public.is_editor());

DROP POLICY IF EXISTS v34_contributions_read ON public.v34_contributions;
CREATE POLICY v34_contributions_read ON public.v34_contributions FOR SELECT
  USING ((lifecycle = 'published' AND classification = 'public') OR author_id = auth.uid() OR public.is_editor());

DROP POLICY IF EXISTS v34_contributions_write ON public.v34_contributions;
CREATE POLICY v34_contributions_write ON public.v34_contributions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND author_id = auth.uid());

DROP POLICY IF EXISTS v34_contributions_update ON public.v34_contributions;
CREATE POLICY v34_contributions_update ON public.v34_contributions FOR UPDATE
  USING (author_id = auth.uid() OR public.is_editor())
  WITH CHECK (author_id = auth.uid() OR public.is_editor());

DROP POLICY IF EXISTS v34_evidence_read ON public.v34_evidence;
CREATE POLICY v34_evidence_read ON public.v34_evidence FOR SELECT
  USING (classification = 'public' OR created_by = auth.uid() OR public.is_editor());

DROP POLICY IF EXISTS v34_evidence_write ON public.v34_evidence;
CREATE POLICY v34_evidence_write ON public.v34_evidence FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (created_by IS NULL OR created_by = auth.uid()));

DROP POLICY IF EXISTS v34_evidence_update ON public.v34_evidence;
CREATE POLICY v34_evidence_update ON public.v34_evidence FOR UPDATE
  USING (created_by = auth.uid() OR public.is_editor());

DROP POLICY IF EXISTS v34_claims_read ON public.v34_claims;
CREATE POLICY v34_claims_read ON public.v34_claims FOR SELECT
  USING (classification = 'public' OR created_by = auth.uid() OR public.is_editor());

DROP POLICY IF EXISTS v34_claims_write ON public.v34_claims;
CREATE POLICY v34_claims_write ON public.v34_claims FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (created_by IS NULL OR created_by = auth.uid()));

DROP POLICY IF EXISTS v34_claim_evidence_read ON public.v34_claim_evidence;
CREATE POLICY v34_claim_evidence_read ON public.v34_claim_evidence FOR SELECT USING (true);

DROP POLICY IF EXISTS v34_claim_evidence_write ON public.v34_claim_evidence;
CREATE POLICY v34_claim_evidence_write ON public.v34_claim_evidence FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS v34_contribution_evidence_read ON public.v34_contribution_evidence;
CREATE POLICY v34_contribution_evidence_read ON public.v34_contribution_evidence FOR SELECT USING (true);

DROP POLICY IF EXISTS v34_contribution_evidence_write ON public.v34_contribution_evidence;
CREATE POLICY v34_contribution_evidence_write ON public.v34_contribution_evidence FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS v34_contribution_claims_read ON public.v34_contribution_claims;
CREATE POLICY v34_contribution_claims_read ON public.v34_contribution_claims FOR SELECT USING (true);

DROP POLICY IF EXISTS v34_contribution_claims_write ON public.v34_contribution_claims;
CREATE POLICY v34_contribution_claims_write ON public.v34_contribution_claims FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Owner-scoped policies for drafts, snapshots, idempotency, library & research goals
DROP POLICY IF EXISTS v34_drafts_owner ON public.v34_drafts;
CREATE POLICY v34_drafts_owner ON public.v34_drafts FOR ALL
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS v34_draft_snapshots_owner ON public.v34_draft_snapshots;
CREATE POLICY v34_draft_snapshots_owner ON public.v34_draft_snapshots FOR ALL
  USING (EXISTS (SELECT 1 FROM public.v34_drafts d WHERE d.id = draft_id AND d.author_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.v34_drafts d WHERE d.id = draft_id AND d.author_id = auth.uid()));

DROP POLICY IF EXISTS v34_idempotency_keys_owner ON public.v34_idempotency_keys;
CREATE POLICY v34_idempotency_keys_owner ON public.v34_idempotency_keys FOR ALL
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS v34_library_items_owner ON public.v34_library_items;
CREATE POLICY v34_library_items_owner ON public.v34_library_items FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS v34_research_goals_owner ON public.v34_research_goals;
CREATE POLICY v34_research_goals_owner ON public.v34_research_goals FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS v34_recognition_signals_read ON public.v34_recognition_signals;
CREATE POLICY v34_recognition_signals_read ON public.v34_recognition_signals FOR SELECT USING (true);

DROP POLICY IF EXISTS v34_recognition_signals_owner ON public.v34_recognition_signals;
CREATE POLICY v34_recognition_signals_owner ON public.v34_recognition_signals FOR INSERT
  WITH CHECK (actor_id = auth.uid());

DROP POLICY IF EXISTS v34_recognition_signals_delete ON public.v34_recognition_signals;
CREATE POLICY v34_recognition_signals_delete ON public.v34_recognition_signals FOR DELETE
  USING (actor_id = auth.uid());

COMMIT;
