-- ResearchWithME v3.4 Wave 8 Migration:
-- Assessments, Library Collections, Project Tasks, Assistant Sessions,
-- Governed Media Renders (Remotion/Hyperframes), Device Sync Cursors,
-- Transactional Outbox, Audit Events, and Background Jobs (Part V §8–§9, §16.3).
-- Strict RLS enabled on every table — zero service-role bypass.

-- 1. Canonical Evidence Assessments (trust/methodology scoring separate from prose)
CREATE TABLE IF NOT EXISTS public.v34_evidence_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id text NOT NULL,
  assessor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rigor_score smallint NOT NULL CHECK (rigor_score BETWEEN 1 AND 5),
  verifiability_score smallint NOT NULL CHECK (verifiability_score BETWEEN 1 AND 5),
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('DRAFT', 'PUBLISHED', 'SUPERSEDED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_v34_evidence_assessments_ev ON public.v34_evidence_assessments(evidence_id, created_at DESC);
ALTER TABLE public.v34_evidence_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "v34_evidence_assessments_select" ON public.v34_evidence_assessments;
CREATE POLICY "v34_evidence_assessments_select"
  ON public.v34_evidence_assessments FOR SELECT
  USING (status = 'PUBLISHED' OR auth.uid() = assessor_id);

DROP POLICY IF EXISTS "v34_evidence_assessments_insert" ON public.v34_evidence_assessments;
CREATE POLICY "v34_evidence_assessments_insert"
  ON public.v34_evidence_assessments FOR INSERT
  WITH CHECK (auth.uid() = assessor_id);

DROP POLICY IF EXISTS "v34_evidence_assessments_update" ON public.v34_evidence_assessments;
CREATE POLICY "v34_evidence_assessments_update"
  ON public.v34_evidence_assessments FOR UPDATE
  USING (auth.uid() = assessor_id)
  WITH CHECK (auth.uid() = assessor_id);

-- 2. Canonical Claim Assessments
CREATE TABLE IF NOT EXISTS public.v34_claim_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id text NOT NULL,
  assessor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evidence_support_score smallint NOT NULL CHECK (evidence_support_score BETWEEN 1 AND 5),
  confidence_level text NOT NULL CHECK (confidence_level IN ('HIGH', 'MODERATE', 'LOW', 'INSUFFICIENT')),
  rationale text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('DRAFT', 'PUBLISHED', 'SUPERSEDED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_v34_claim_assessments_clm ON public.v34_claim_assessments(claim_id, created_at DESC);
ALTER TABLE public.v34_claim_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "v34_claim_assessments_select" ON public.v34_claim_assessments;
CREATE POLICY "v34_claim_assessments_select"
  ON public.v34_claim_assessments FOR SELECT
  USING (status = 'PUBLISHED' OR auth.uid() = assessor_id);

DROP POLICY IF EXISTS "v34_claim_assessments_insert" ON public.v34_claim_assessments;
CREATE POLICY "v34_claim_assessments_insert"
  ON public.v34_claim_assessments FOR INSERT
  WITH CHECK (auth.uid() = assessor_id);

DROP POLICY IF EXISTS "v34_claim_assessments_update" ON public.v34_claim_assessments;
CREATE POLICY "v34_claim_assessments_update"
  ON public.v34_claim_assessments FOR UPDATE
  USING (auth.uid() = assessor_id)
  WITH CHECK (auth.uid() = assessor_id);

-- 3. User Library Collections (organizational folders distinct from CitationCollections)
CREATE TABLE IF NOT EXISTS public.v34_library_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  color_token text NOT NULL DEFAULT 'accent',
  item_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_v34_library_collections_user ON public.v34_library_collections(user_id, updated_at DESC);
ALTER TABLE public.v34_library_collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "v34_library_collections_owner" ON public.v34_library_collections;
CREATE POLICY "v34_library_collections_owner"
  ON public.v34_library_collections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Project Tasks (scoped to ResearchProject, distinct from personal ResearchGoals)
CREATE TABLE IF NOT EXISTS public.v34_project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE')),
  priority text NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  due_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_v34_project_tasks_project ON public.v34_project_tasks(project_id, status);
ALTER TABLE public.v34_project_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "v34_project_tasks_access" ON public.v34_project_tasks;
CREATE POLICY "v34_project_tasks_access"
  ON public.v34_project_tasks FOR ALL
  USING (auth.uid() = creator_id OR auth.uid() = assignee_id)
  WITH CHECK (auth.uid() = creator_id OR auth.uid() = assignee_id);

-- 5. Conversational Research Assistant Sessions & Messages
CREATE TABLE IF NOT EXISTS public.v34_assistant_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id text,
  title text NOT NULL DEFAULT 'Research session',
  data_classification text NOT NULL DEFAULT 'INTERNAL' CHECK (data_classification IN ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED')),
  context_source_ids text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_v34_assistant_sessions_user ON public.v34_assistant_sessions(user_id, updated_at DESC);
ALTER TABLE public.v34_assistant_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "v34_assistant_sessions_owner" ON public.v34_assistant_sessions;
CREATE POLICY "v34_assistant_sessions_owner"
  ON public.v34_assistant_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.v34_assistant_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.v34_assistant_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('USER', 'ASSISTANT', 'SYSTEM')),
  content text NOT NULL,
  cited_source_ids text[] NOT NULL DEFAULT '{}',
  provenance_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_v34_assistant_messages_session ON public.v34_assistant_messages(session_id, created_at ASC);
ALTER TABLE public.v34_assistant_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "v34_assistant_messages_owner" ON public.v34_assistant_messages;
CREATE POLICY "v34_assistant_messages_owner"
  ON public.v34_assistant_messages FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. Governed Media Render Jobs (Remotion & Hyperframes, Part V §16.3)
CREATE TABLE IF NOT EXISTS public.v34_render_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  engine text NOT NULL CHECK (engine IN ('REMOTION', 'HYPERFRAMES')),
  composition_id text NOT NULL,
  source_contribution_id text,
  status text NOT NULL DEFAULT 'PENDING_APPROVAL' CHECK (status IN ('PENDING_APPROVAL', 'QUEUED', 'RENDERING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  human_approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  human_approved_at timestamptz,
  input_checksum_sha256 text NOT NULL,
  output_checksum_sha256 text,
  output_url text,
  duration_seconds integer NOT NULL DEFAULT 30 CHECK (duration_seconds BETWEEN 1 AND 600),
  token_checksum text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_v34_render_jobs_owner ON public.v34_render_jobs(owner_id, created_at DESC);
ALTER TABLE public.v34_render_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "v34_render_jobs_owner" ON public.v34_render_jobs;
CREATE POLICY "v34_render_jobs_owner"
  ON public.v34_render_jobs FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- 7. Device Sync Cursors (for POST /api/sync/acknowledge)
CREATE TABLE IF NOT EXISTS public.v34_device_sync_cursors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  resource_type text NOT NULL CHECK (resource_type IN ('library', 'notifications', 'attention', 'goals', 'drafts', 'contributions')),
  cursor text NOT NULL,
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id, resource_type)
);
ALTER TABLE public.v34_device_sync_cursors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "v34_device_sync_cursors_owner" ON public.v34_device_sync_cursors;
CREATE POLICY "v34_device_sync_cursors_owner"
  ON public.v34_device_sync_cursors FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 8. Operational Outbox, Audit Events & Background Jobs (Part V §8.2 & §9)
CREATE TABLE IF NOT EXISTS public.v34_outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  aggregate_id text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempts integer NOT NULL DEFAULT 0,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_v34_outbox_events_pending ON public.v34_outbox_events(published_at, created_at);
ALTER TABLE public.v34_outbox_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "v34_outbox_events_actor" ON public.v34_outbox_events;
CREATE POLICY "v34_outbox_events_actor"
  ON public.v34_outbox_events FOR SELECT
  USING (auth.uid() = actor_id);

DROP POLICY IF EXISTS "v34_outbox_events_insert" ON public.v34_outbox_events;
CREATE POLICY "v34_outbox_events_insert"
  ON public.v34_outbox_events FOR INSERT
  WITH CHECK (actor_id IS NULL OR auth.uid() = actor_id);

CREATE TABLE IF NOT EXISTS public.v34_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  workspace_id text,
  request_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_v34_audit_events_actor ON public.v34_audit_events(actor_id, created_at DESC);
ALTER TABLE public.v34_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "v34_audit_events_actor" ON public.v34_audit_events;
CREATE POLICY "v34_audit_events_actor"
  ON public.v34_audit_events FOR SELECT
  USING (auth.uid() = actor_id);

DROP POLICY IF EXISTS "v34_audit_events_insert" ON public.v34_audit_events;
CREATE POLICY "v34_audit_events_insert"
  ON public.v34_audit_events FOR INSERT
  WITH CHECK (actor_id IS NULL OR auth.uid() = actor_id);

CREATE TABLE IF NOT EXISTS public.v34_background_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  job_type text NOT NULL,
  status text NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb,
  error text,
  attempts integer NOT NULL DEFAULT 0,
  run_after timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_v34_background_jobs_sched ON public.v34_background_jobs(status, run_after);
ALTER TABLE public.v34_background_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "v34_background_jobs_owner" ON public.v34_background_jobs;
CREATE POLICY "v34_background_jobs_owner"
  ON public.v34_background_jobs FOR ALL
  USING (owner_id IS NULL OR auth.uid() = owner_id)
  WITH CHECK (owner_id IS NULL OR auth.uid() = owner_id);
