-- ResearchWithME v3.4 Wave 6 Migration:
--   - Canonical AI Provenance Ledger (Part I §16, Part V §6.11, Part VIII §E)
--   - Checksummed Scholarly Exports (Part V §6.13)
--   - Immutable Contribution Version Snapshots (Part V §6.8)
--   - Workspace Membership Invitations (Part V §6.2)
--   - PostgreSQL Lexical (tsvector) + Fuzzy (pg_trgm) Search Indexes (Part V §10.1)
-- Strictly additive & RLS-protected. Zero service-role bypass.

-- 1. AI Provenance Ledger (Part I §16 & Part VIII §E)
CREATE TABLE IF NOT EXISTS public.v34_ai_provenance_records (
  id text PRIMARY KEY,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  workspace_id text REFERENCES public.v34_workspaces(id) ON DELETE SET NULL,
  target_type text NOT NULL CHECK (target_type IN ('contribution', 'draft', 'claim', 'evidence', 'search', 'citation-check')),
  target_id text NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  model_version text NOT NULL DEFAULT 'unspecified',
  operation text NOT NULL,
  prompt_template_version text NOT NULL DEFAULT 'v1',
  retrieval_time timestamptz NOT NULL DEFAULT now(),
  source_ids text[] NOT NULL DEFAULT '{}'::text[],
  tool_calls jsonb NOT NULL DEFAULT '[]'::jsonb,
  generation_time_ms integer NOT NULL DEFAULT 0 CHECK (generation_time_ms >= 0),
  transformation_type text NOT NULL CHECK (transformation_type IN ('validate-citations', 'check-quotation', 'check-entailment', 'search-expand', 'draft-assist', 'summarize')),
  citation_validation_status text NOT NULL DEFAULT 'PENDING' CHECK (citation_validation_status IN ('PENDING', 'PASSED', 'FAILED', 'NOT_APPLICABLE')),
  human_review_status text NOT NULL DEFAULT 'PENDING' CHECK (human_review_status IN ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text NOT NULL DEFAULT '',
  data_classification text NOT NULL DEFAULT 'PUBLIC' CHECK (data_classification IN ('PUBLIC', 'WORKSPACE', 'RESTRICTED', 'CONFIDENTIAL')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS v34_ai_provenance_target_idx
  ON public.v34_ai_provenance_records (target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS v34_ai_provenance_review_idx
  ON public.v34_ai_provenance_records (human_review_status, created_at DESC);

ALTER TABLE public.v34_ai_provenance_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'v34_ai_provenance_records'
      AND policyname = 'v34_ai_provenance_read_policy'
  ) THEN
    CREATE POLICY v34_ai_provenance_read_policy
      ON public.v34_ai_provenance_records
      FOR SELECT
      USING (
        data_classification = 'PUBLIC'
        OR actor_id = auth.uid()
        OR (workspace_id IS NOT NULL AND public.v34_is_workspace_member(workspace_id))
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'v34_ai_provenance_records'
      AND policyname = 'v34_ai_provenance_insert_policy'
  ) THEN
    CREATE POLICY v34_ai_provenance_insert_policy
      ON public.v34_ai_provenance_records
      FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL AND (actor_id IS NULL OR actor_id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'v34_ai_provenance_records'
      AND policyname = 'v34_ai_provenance_update_policy'
  ) THEN
    CREATE POLICY v34_ai_provenance_update_policy
      ON public.v34_ai_provenance_records
      FOR UPDATE
      USING (
        actor_id = auth.uid()
        OR (workspace_id IS NOT NULL AND public.v34_is_workspace_member(workspace_id))
      )
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- 2. Checksummed Scholarly Exports (Part V §6.13)
CREATE TABLE IF NOT EXISTS public.v34_scholarly_exports (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('contribution', 'source', 'citation-collection')),
  target_id text NOT NULL,
  format text NOT NULL CHECK (format IN ('bibtex', 'csl-json', 'markdown-provenance', 'json-ld')),
  status text NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
  checksum_sha256 text NOT NULL,
  content_type text NOT NULL,
  payload text NOT NULL,
  byte_size integer NOT NULL CHECK (byte_size >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS v34_scholarly_exports_user_idx
  ON public.v34_scholarly_exports (user_id, created_at DESC);

ALTER TABLE public.v34_scholarly_exports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'v34_scholarly_exports'
      AND policyname = 'v34_scholarly_exports_owner_all'
  ) THEN
    CREATE POLICY v34_scholarly_exports_owner_all
      ON public.v34_scholarly_exports
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- 3. Immutable Contribution Version Snapshots (Part V §6.8)
CREATE TABLE IF NOT EXISTS public.v34_contribution_versions (
  id text PRIMARY KEY,
  contribution_id text NOT NULL REFERENCES public.v34_contributions(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number >= 1),
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  mdx text NOT NULL DEFAULT '',
  lifecycle text NOT NULL,
  checksum_sha256 text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contribution_id, version_number)
);

CREATE INDEX IF NOT EXISTS v34_contribution_versions_contrib_idx
  ON public.v34_contribution_versions (contribution_id, version_number DESC);

ALTER TABLE public.v34_contribution_versions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'v34_contribution_versions'
      AND policyname = 'v34_contribution_versions_read_policy'
  ) THEN
    CREATE POLICY v34_contribution_versions_read_policy
      ON public.v34_contribution_versions
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'v34_contribution_versions'
      AND policyname = 'v34_contribution_versions_insert_policy'
  ) THEN
    CREATE POLICY v34_contribution_versions_insert_policy
      ON public.v34_contribution_versions
      FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- 4. Workspace Membership Invitations (Part V §6.2)
CREATE TABLE IF NOT EXISTS public.v34_workspace_invitations (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES public.v34_workspaces(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  role text NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER', 'REVIEWER', 'VIEWER')),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED', 'EXPIRED')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS v34_workspace_invitations_ws_idx
  ON public.v34_workspace_invitations (workspace_id, status, created_at DESC);

ALTER TABLE public.v34_workspace_invitations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'v34_workspace_invitations'
      AND policyname = 'v34_workspace_invitations_member_all'
  ) THEN
    CREATE POLICY v34_workspace_invitations_member_all
      ON public.v34_workspace_invitations
      FOR ALL
      USING (public.v34_is_workspace_member(workspace_id))
      WITH CHECK (public.v34_is_workspace_member(workspace_id));
  END IF;
END $$;

-- 5. PostgreSQL Lexical (tsvector) + Fuzzy (pg_trgm) Search Indexes (Part V §10.1)
CREATE INDEX IF NOT EXISTS v34_sources_fts_gin_idx
  ON public.v34_sources
  USING gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(venue, '') || ' ' || coalesce(identifier_value, '')));

CREATE INDEX IF NOT EXISTS v34_sources_title_trgm_idx
  ON public.v34_sources
  USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS v34_contributions_fts_gin_idx
  ON public.v34_contributions
  USING gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, '')));

CREATE INDEX IF NOT EXISTS v34_claims_fts_gin_idx
  ON public.v34_claims
  USING gin (to_tsvector('english', coalesce(statement, '')));

CREATE INDEX IF NOT EXISTS v34_tools_fts_gin_idx
  ON public.v34_tool_repositories
  USING gin (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(summary, '')));

CREATE INDEX IF NOT EXISTS v34_topics_fts_gin_idx
  ON public.v34_topics
  USING gin (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));
