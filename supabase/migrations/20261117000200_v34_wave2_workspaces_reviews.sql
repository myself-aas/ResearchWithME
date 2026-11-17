-- ResearchWithME v3.4 Wave 2 Schema: Collaborative Workspaces, Projects,
-- Formal Peer Review & Rebuttal Threads, and Claim–Evidence Edge Curation.
-- Strategy: additive expand migration compatible with Wave 1 v34_* tables.
-- Invariants enforced per ResearchWithME-master-refactor-development-plan-v3.4.md:
--   - Lock budget <= 5s; fully idempotent DDL.
--   - §7 Workspace/Project boundary: ProjectMember MUST resolve to an active WorkspaceMember
--     via composite foreign key (workspace_id, user_id).
--   - §6 Formal Review separation: version-aware reviews, anonymous reviewer policy,
--     rebuttals linked to >= 1 review item, decisions requiring rationale.
--   - Zero service-role runtime; full RLS on every table.

BEGIN;
SET LOCAL lock_timeout = '5s';

-- -----------------------------------------------------------------------------
-- 1. WAVE 2 ENUMS (idempotent)
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.v34_workspace_role AS ENUM (
    'OWNER',
    'ADMIN',
    'EDITOR',
    'CONTRIBUTOR',
    'REVIEWER',
    'VIEWER'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.v34_project_stage AS ENUM (
    'SCOPING',
    'LITERATURE_REVIEW',
    'EXPERIMENTATION',
    'SYNTHESIS',
    'UNDER_REVIEW',
    'PUBLISHED',
    'ARCHIVED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.v34_milestone_status AS ENUM (
    'PLANNED',
    'IN_PROGRESS',
    'BLOCKED',
    'COMPLETED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.v34_review_status AS ENUM (
    'OPEN',
    'IN_PROGRESS',
    'SUBMITTED',
    'RESOLVED',
    'WITHDRAWN'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.v34_review_decision_outcome AS ENUM (
    'ACCEPT',
    'MINOR_REVISION',
    'MAJOR_REVISION',
    'REJECT'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 2. COLLABORATIVE WORKSPACES & PROJECTS (§7 boundary)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.v34_workspaces (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'workspace', 'private')),
  default_classification public.v34_data_classification NOT NULL DEFAULT 'public',
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.v34_workspace_members (
  workspace_id text NOT NULL REFERENCES public.v34_workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  handle text NOT NULL,
  display_name text NOT NULL,
  role public.v34_workspace_role NOT NULL DEFAULT 'CONTRIBUTOR',
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INVITED', 'SUSPENDED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_v34_workspace_members_user
  ON public.v34_workspace_members(user_id, status);

CREATE TABLE IF NOT EXISTS public.v34_projects (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES public.v34_workspaces(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  objective text NOT NULL,
  stage public.v34_project_stage NOT NULL DEFAULT 'SCOPING',
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'workspace', 'private')),
  classification public.v34_data_classification NOT NULL DEFAULT 'public',
  topics text[] NOT NULL DEFAULT '{}'::text[],
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_v34_projects_workspace
  ON public.v34_projects(workspace_id, stage, updated_at DESC);

-- Composite foreign keys guarantee §7 invariant:
-- every project member must belong to the project's owning workspace.
CREATE TABLE IF NOT EXISTS public.v34_project_members (
  project_id text NOT NULL,
  workspace_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.v34_workspace_role NOT NULL DEFAULT 'CONTRIBUTOR',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id),
  FOREIGN KEY (project_id, workspace_id) REFERENCES public.v34_projects(id, workspace_id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, user_id) REFERENCES public.v34_workspace_members(workspace_id, user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.v34_project_milestones (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES public.v34_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status public.v34_milestone_status NOT NULL DEFAULT 'PLANNED',
  due_at timestamptz,
  completed_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v34_project_milestones_project
  ON public.v34_project_milestones(project_id, sort_order, created_at);

CREATE TABLE IF NOT EXISTS public.v34_project_objects (
  project_id text NOT NULL REFERENCES public.v34_projects(id) ON DELETE CASCADE,
  object_type text NOT NULL CHECK (object_type IN ('source', 'evidence', 'claim', 'contribution')),
  object_id text NOT NULL,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, object_type, object_id)
);

-- -----------------------------------------------------------------------------
-- 3. FORMAL PEER REVIEW, REBUTTALS & DECISIONS (§6)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.v34_reviews (
  id text PRIMARY KEY,
  contribution_id text NOT NULL REFERENCES public.v34_contributions(id) ON DELETE CASCADE,
  contribution_version integer NOT NULL DEFAULT 1 CHECK (contribution_version > 0),
  requester_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_handle text,
  reviewer_name text NOT NULL DEFAULT 'Reviewer',
  anonymous boolean NOT NULL DEFAULT false,
  scope text NOT NULL DEFAULT 'Full contribution',
  status public.v34_review_status NOT NULL DEFAULT 'OPEN',
  recommendation public.v34_review_decision_outcome,
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v34_reviews_contribution
  ON public.v34_reviews(contribution_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.v34_review_items (
  id text PRIMARY KEY,
  review_id text NOT NULL REFERENCES public.v34_reviews(id) ON DELETE CASCADE,
  item_type text NOT NULL DEFAULT 'review' CHECK (item_type IN ('review', 'suggestion', 'comment')),
  scope text,
  body text NOT NULL CHECK (length(trim(body)) >= 5),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'rejected', 'resolved')),
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL DEFAULT 'Reviewer',
  anonymous boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v34_review_items_review
  ON public.v34_review_items(review_id, created_at ASC);

CREATE TABLE IF NOT EXISTS public.v34_review_rebuttals (
  id text PRIMARY KEY,
  review_id text NOT NULL REFERENCES public.v34_reviews(id) ON DELETE CASCADE,
  review_item_ids text[] NOT NULL CHECK (array_length(review_item_ids, 1) >= 1),
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  body text NOT NULL CHECK (length(trim(body)) >= 5),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.v34_review_decisions (
  id text PRIMARY KEY,
  review_id text NOT NULL REFERENCES public.v34_reviews(id) ON DELETE CASCADE,
  outcome public.v34_review_decision_outcome NOT NULL,
  rationale text NOT NULL CHECK (length(trim(rationale)) >= 10),
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_by_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY & HELPER FUNCTIONS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.v34_is_workspace_member(ws_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.v34_workspace_members m
    WHERE m.workspace_id = ws_id
      AND m.user_id = auth.uid()
      AND m.status = 'ACTIVE'
  );
$$;

ALTER TABLE public.v34_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_project_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_review_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_review_rebuttals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_review_decisions ENABLE ROW LEVEL SECURITY;

-- Workspaces
DROP POLICY IF EXISTS v34_workspaces_read ON public.v34_workspaces;
CREATE POLICY v34_workspaces_read ON public.v34_workspaces FOR SELECT
  USING (visibility = 'public' OR owner_id = auth.uid() OR public.v34_is_workspace_member(id) OR public.is_editor());

DROP POLICY IF EXISTS v34_workspaces_insert ON public.v34_workspaces;
CREATE POLICY v34_workspaces_insert ON public.v34_workspaces FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (owner_id IS NULL OR owner_id = auth.uid()));

DROP POLICY IF EXISTS v34_workspaces_update ON public.v34_workspaces;
CREATE POLICY v34_workspaces_update ON public.v34_workspaces FOR UPDATE
  USING (owner_id = auth.uid() OR public.is_editor());

-- Workspace members
DROP POLICY IF EXISTS v34_workspace_members_read ON public.v34_workspace_members;
CREATE POLICY v34_workspace_members_read ON public.v34_workspace_members FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.v34_workspaces w WHERE w.id = workspace_id AND w.visibility = 'public')
    OR user_id = auth.uid()
    OR public.v34_is_workspace_member(workspace_id)
    OR public.is_editor()
  );

DROP POLICY IF EXISTS v34_workspace_members_write ON public.v34_workspace_members;
CREATE POLICY v34_workspace_members_write ON public.v34_workspace_members FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.v34_workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
      OR public.is_editor()
    )
  );

-- Projects
DROP POLICY IF EXISTS v34_projects_read ON public.v34_projects;
CREATE POLICY v34_projects_read ON public.v34_projects FOR SELECT
  USING (visibility = 'public' OR owner_id = auth.uid() OR public.v34_is_workspace_member(workspace_id) OR public.is_editor());

DROP POLICY IF EXISTS v34_projects_insert ON public.v34_projects;
CREATE POLICY v34_projects_insert ON public.v34_projects FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (owner_id IS NULL OR owner_id = auth.uid()));

DROP POLICY IF EXISTS v34_projects_update ON public.v34_projects;
CREATE POLICY v34_projects_update ON public.v34_projects FOR UPDATE
  USING (owner_id = auth.uid() OR public.v34_is_workspace_member(workspace_id) OR public.is_editor());

-- Project members, milestones, objects
DROP POLICY IF EXISTS v34_project_members_read ON public.v34_project_members;
CREATE POLICY v34_project_members_read ON public.v34_project_members FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.v34_projects p WHERE p.id = project_id AND p.visibility = 'public')
    OR public.v34_is_workspace_member(workspace_id)
    OR public.is_editor()
  );

DROP POLICY IF EXISTS v34_project_members_write ON public.v34_project_members;
CREATE POLICY v34_project_members_write ON public.v34_project_members FOR INSERT
  WITH CHECK (public.v34_is_workspace_member(workspace_id) OR public.is_editor());

DROP POLICY IF EXISTS v34_project_milestones_read ON public.v34_project_milestones;
CREATE POLICY v34_project_milestones_read ON public.v34_project_milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.v34_projects p
      WHERE p.id = project_id
        AND (p.visibility = 'public' OR p.owner_id = auth.uid() OR public.v34_is_workspace_member(p.workspace_id) OR public.is_editor())
    )
  );

DROP POLICY IF EXISTS v34_project_milestones_write ON public.v34_project_milestones;
CREATE POLICY v34_project_milestones_write ON public.v34_project_milestones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.v34_projects p
      WHERE p.id = project_id AND (p.owner_id = auth.uid() OR public.v34_is_workspace_member(p.workspace_id) OR public.is_editor())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.v34_projects p
      WHERE p.id = project_id AND (p.owner_id = auth.uid() OR public.v34_is_workspace_member(p.workspace_id) OR public.is_editor())
    )
  );

DROP POLICY IF EXISTS v34_project_objects_read ON public.v34_project_objects;
CREATE POLICY v34_project_objects_read ON public.v34_project_objects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.v34_projects p
      WHERE p.id = project_id
        AND (p.visibility = 'public' OR p.owner_id = auth.uid() OR public.v34_is_workspace_member(p.workspace_id) OR public.is_editor())
    )
  );

DROP POLICY IF EXISTS v34_project_objects_write ON public.v34_project_objects;
CREATE POLICY v34_project_objects_write ON public.v34_project_objects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.v34_projects p
      WHERE p.id = project_id AND (p.owner_id = auth.uid() OR public.v34_is_workspace_member(p.workspace_id) OR public.is_editor())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.v34_projects p
      WHERE p.id = project_id AND (p.owner_id = auth.uid() OR public.v34_is_workspace_member(p.workspace_id) OR public.is_editor())
    )
  );

-- Formal peer review tables
DROP POLICY IF EXISTS v34_reviews_read ON public.v34_reviews;
CREATE POLICY v34_reviews_read ON public.v34_reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS v34_reviews_insert ON public.v34_reviews;
CREATE POLICY v34_reviews_insert ON public.v34_reviews FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS v34_reviews_update ON public.v34_reviews;
CREATE POLICY v34_reviews_update ON public.v34_reviews FOR UPDATE
  USING (reviewer_id = auth.uid() OR requester_id = auth.uid() OR public.is_editor());

DROP POLICY IF EXISTS v34_review_items_read ON public.v34_review_items;
CREATE POLICY v34_review_items_read ON public.v34_review_items FOR SELECT USING (true);

DROP POLICY IF EXISTS v34_review_items_write ON public.v34_review_items;
CREATE POLICY v34_review_items_write ON public.v34_review_items FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS v34_review_items_update ON public.v34_review_items;
CREATE POLICY v34_review_items_update ON public.v34_review_items FOR UPDATE
  USING (author_id = auth.uid() OR public.is_editor());

DROP POLICY IF EXISTS v34_review_rebuttals_read ON public.v34_review_rebuttals;
CREATE POLICY v34_review_rebuttals_read ON public.v34_review_rebuttals FOR SELECT USING (true);

DROP POLICY IF EXISTS v34_review_rebuttals_write ON public.v34_review_rebuttals;
CREATE POLICY v34_review_rebuttals_write ON public.v34_review_rebuttals FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS v34_review_decisions_read ON public.v34_review_decisions;
CREATE POLICY v34_review_decisions_read ON public.v34_review_decisions FOR SELECT USING (true);

DROP POLICY IF EXISTS v34_review_decisions_write ON public.v34_review_decisions;
CREATE POLICY v34_review_decisions_write ON public.v34_review_decisions FOR INSERT
  WITH CHECK (public.is_editor() OR auth.uid() IS NOT NULL);

-- Allow authenticated human reviewers to accept/reject AI-proposed ClaimEvidence edges
DROP POLICY IF EXISTS v34_claim_evidence_update ON public.v34_claim_evidence;
CREATE POLICY v34_claim_evidence_update ON public.v34_claim_evidence FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

COMMIT;
