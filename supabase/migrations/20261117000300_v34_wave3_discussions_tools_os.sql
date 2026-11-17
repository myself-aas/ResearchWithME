-- =============================================================================
-- ResearchWithME v3.4 — Wave 3: Informal Discussions, Global Tool Repository
-- Observations, Project Working Notes, Notifications / Attention / Assistant
-- Tasks Separation, Event-Fact Recognition Ledger & Dashboard Preferences
--
-- Purely additive migration building cleanly on Wave 1 (19 v34_* tables)
-- and Wave 2 (10 v34_* tables) -> 38 canonical v34_* tables total.
-- =============================================================================

-- 1. Wave 3 Enums (idempotent) ------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.v34_attention_kind AS ENUM (
    'DRAFT_CONFLICT', 'RETRACTION_IMPACT', 'REVIEW_DEADLINE',
    'PERMISSION_ISSUE', 'UNRESOLVED_CITATION', 'ASSISTANT'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.v34_attention_severity AS ENUM ('INFO', 'WARNING', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.v34_attention_status AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.v34_assistant_task_status AS ENUM ('SUGGESTED', 'ACCEPTED', 'COMPLETED', 'DISMISSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.v34_recognition_event_type AS ENUM (
    'CONTRIBUTION_REFERENCED', 'REVIEW_HELPFUL', 'EVIDENCE_REUSED',
    'CORRECTION_ACCEPTED', 'REPLICATION_REPORTED', 'REVIEW_COMPLETED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.v34_default_landing AS ENUM ('DASHBOARD', 'FEED', 'LIBRARY', 'PROJECTS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Informal Scholarly Discussions (§6 — separate from v34_reviews) ----------

CREATE TABLE IF NOT EXISTS public.v34_discussions (
  id text PRIMARY KEY,
  object_type text NOT NULL CHECK (object_type IN ('contribution', 'source', 'project', 'claim', 'tool')),
  object_id text NOT NULL,
  title text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  locked boolean NOT NULL DEFAULT false,
  locked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  locked_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v34_discussions_object
  ON public.v34_discussions(object_type, object_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.v34_discussion_comments (
  id text PRIMARY KEY,
  discussion_id text NOT NULL REFERENCES public.v34_discussions(id) ON DELETE CASCADE,
  parent_comment_id text REFERENCES public.v34_discussion_comments(id) ON DELETE SET NULL,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  body text NOT NULL,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v34_discussion_comments_thread
  ON public.v34_discussion_comments(discussion_id, created_at ASC);

-- 3. Enrich Global Tool Repository & Software Source Links (§8) ---------------

ALTER TABLE public.v34_tool_repositories
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'github' CHECK (provider IN ('github', 'gitlab', 'huggingface', 'other')),
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS repo_name text,
  ADD COLUMN IF NOT EXISTS topics text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS stars_count integer CHECK (stars_count IS NULL OR stars_count >= 0),
  ADD COLUMN IF NOT EXISTS forks_count integer CHECK (forks_count IS NULL OR forks_count >= 0),
  ADD COLUMN IF NOT EXISTS latest_release_tag text,
  ADD COLUMN IF NOT EXISTS observed_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.v34_tool_source_links
  ADD COLUMN IF NOT EXISTS commit_sha text,
  ADD COLUMN IF NOT EXISTS package_version text,
  ADD COLUMN IF NOT EXISTS archived_url text,
  ADD COLUMN IF NOT EXISTS observed_at timestamptz NOT NULL DEFAULT now();

-- 4. Private Project Working Notes (§9 — replaces deprecated ResearchNote) ----

CREATE TABLE IF NOT EXISTS public.v34_project_notes (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES public.v34_workspaces(id) ON DELETE CASCADE,
  project_id text NOT NULL REFERENCES public.v34_projects(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  title text NOT NULL,
  body_markdown text NOT NULL DEFAULT '',
  classification public.v34_data_classification NOT NULL DEFAULT 'workspace',
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v34_project_notes_project
  ON public.v34_project_notes(project_id, updated_at DESC);

-- 5. Notifications, Attention Items & Assistant Tasks (§10) -------------------

CREATE TABLE IF NOT EXISTS public.v34_notifications (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  object_type text,
  object_id text,
  action_href text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v34_notifications_user
  ON public.v34_notifications(user_id, read_at NULLS FIRST, created_at DESC);

CREATE TABLE IF NOT EXISTS public.v34_attention_items (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id text REFERENCES public.v34_workspaces(id) ON DELETE SET NULL,
  kind public.v34_attention_kind NOT NULL,
  severity public.v34_attention_severity NOT NULL DEFAULT 'INFO',
  status public.v34_attention_status NOT NULL DEFAULT 'OPEN',
  object_type text NOT NULL,
  object_id text NOT NULL,
  title text NOT NULL,
  explanation text NOT NULL DEFAULT '',
  action_label text NOT NULL DEFAULT 'Review',
  action_href text NOT NULL DEFAULT '/dashboard',
  promoted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v34_attention_user_status
  ON public.v34_attention_items(user_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.v34_assistant_tasks (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id text REFERENCES public.v34_workspaces(id) ON DELETE SET NULL,
  task_type text NOT NULL CHECK (task_type IN ('compare-sources', 'suggest-citations', 'summarize-method', 'draft-perspective')),
  title text NOT NULL,
  explanation text NOT NULL DEFAULT '',
  status public.v34_assistant_task_status NOT NULL DEFAULT 'SUGGESTED',
  source_ids text[] NOT NULL DEFAULT '{}'::text[],
  promoted_attention_id text REFERENCES public.v34_attention_items(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v34_assistant_tasks_user
  ON public.v34_assistant_tasks(user_id, status, created_at DESC);

-- 6. Event-Fact Recognition Ledger (§11 — zero composite vanity scores) -------

CREATE TABLE IF NOT EXISTS public.v34_recognition_events (
  id text PRIMARY KEY,
  recipient_handle text NOT NULL,
  recipient_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type public.v34_recognition_event_type NOT NULL,
  object_type text NOT NULL,
  object_id text NOT NULL,
  reversed_at timestamptz,
  reversal_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (actor_id IS NULL OR recipient_user_id IS NULL OR actor_id <> recipient_user_id)
);

CREATE INDEX IF NOT EXISTS idx_v34_recognition_recipient
  ON public.v34_recognition_events(recipient_handle, reversed_at NULLS FIRST, created_at DESC);

-- 7. Dashboard Preferences & FK-backed Topic Follows (§13 & §14) --------------

CREATE TABLE IF NOT EXISTS public.v34_dashboard_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_landing public.v34_default_landing NOT NULL DEFAULT 'DASHBOARD',
  digest_frequency text NOT NULL DEFAULT 'weekly' CHECK (digest_frequency IN ('off', 'daily', 'weekly')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.v34_topic_follows (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_slug text NOT NULL,
  topic_label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, topic_slug)
);

-- 8. Row Level Security Policies (zero service-role bypass) -------------------

ALTER TABLE public.v34_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_discussion_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_project_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_attention_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_assistant_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_recognition_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_dashboard_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_topic_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "v34_discussions_read" ON public.v34_discussions;
CREATE POLICY "v34_discussions_read" ON public.v34_discussions FOR SELECT USING (true);
DROP POLICY IF EXISTS "v34_discussions_insert" ON public.v34_discussions;
CREATE POLICY "v34_discussions_insert" ON public.v34_discussions FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() OR created_by IS NULL);
DROP POLICY IF EXISTS "v34_discussions_update" ON public.v34_discussions;
CREATE POLICY "v34_discussions_update" ON public.v34_discussions FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.is_editor());

DROP POLICY IF EXISTS "v34_discussion_comments_read" ON public.v34_discussion_comments;
CREATE POLICY "v34_discussion_comments_read" ON public.v34_discussion_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "v34_discussion_comments_insert" ON public.v34_discussion_comments;
CREATE POLICY "v34_discussion_comments_insert" ON public.v34_discussion_comments FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid() OR author_id IS NULL);
DROP POLICY IF EXISTS "v34_discussion_comments_update" ON public.v34_discussion_comments;
CREATE POLICY "v34_discussion_comments_update" ON public.v34_discussion_comments FOR UPDATE TO authenticated USING (author_id = auth.uid() OR public.is_editor());

DROP POLICY IF EXISTS "v34_tools_update" ON public.v34_tool_repositories;
CREATE POLICY "v34_tools_update" ON public.v34_tool_repositories FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.is_editor());

DROP POLICY IF EXISTS "v34_project_notes_read" ON public.v34_project_notes;
CREATE POLICY "v34_project_notes_read" ON public.v34_project_notes
  FOR SELECT USING (classification = 'public' OR author_id = auth.uid() OR public.v34_is_workspace_member(workspace_id) OR public.is_editor());
DROP POLICY IF EXISTS "v34_project_notes_write" ON public.v34_project_notes;
CREATE POLICY "v34_project_notes_write" ON public.v34_project_notes
  FOR ALL TO authenticated
  USING (author_id = auth.uid() OR public.v34_is_workspace_member(workspace_id) OR public.is_editor())
  WITH CHECK (author_id = auth.uid() OR public.v34_is_workspace_member(workspace_id) OR public.is_editor());

DROP POLICY IF EXISTS "v34_notifications_owner" ON public.v34_notifications;
CREATE POLICY "v34_notifications_owner" ON public.v34_notifications FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "v34_attention_owner" ON public.v34_attention_items;
CREATE POLICY "v34_attention_owner" ON public.v34_attention_items FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "v34_assistant_tasks_owner" ON public.v34_assistant_tasks;
CREATE POLICY "v34_assistant_tasks_owner" ON public.v34_assistant_tasks FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "v34_dashboard_prefs_owner" ON public.v34_dashboard_preferences;
CREATE POLICY "v34_dashboard_prefs_owner" ON public.v34_dashboard_preferences FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "v34_topic_follows_owner" ON public.v34_topic_follows;
CREATE POLICY "v34_topic_follows_owner" ON public.v34_topic_follows FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "v34_recognition_read" ON public.v34_recognition_events;
CREATE POLICY "v34_recognition_read" ON public.v34_recognition_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "v34_recognition_insert" ON public.v34_recognition_events;
CREATE POLICY "v34_recognition_insert" ON public.v34_recognition_events FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid() AND (recipient_user_id IS NULL OR recipient_user_id <> auth.uid()));
DROP POLICY IF EXISTS "v34_recognition_reverse" ON public.v34_recognition_events;
CREATE POLICY "v34_recognition_reverse" ON public.v34_recognition_events FOR UPDATE TO authenticated USING (public.is_editor());
