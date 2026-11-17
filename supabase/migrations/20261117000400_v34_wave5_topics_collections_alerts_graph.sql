-- =============================================================================
-- ResearchWithME v3.4 Wave 5 Migration:
--   • Part VII §1: First-class Topic Taxonomy & FK-backed Topic Assignments
--   • Part VII §1 / §B.4: WorkspaceTool access bridge to global ToolRepository
--   • Part VII §1 / §4: Saved Searches & Search Alerts
--   • Part VII §1 / §3: Citation Collections & single-target Citation Items
--   • Part VII §1 / §B.8: Rebuildable GraphNode / GraphEdge Read Projection
--   • Part VI §12 / §13: Goal Progress Events & Pause/Archive Timestamps
-- =============================================================================

-- ── 1. First-class Topic Taxonomy & FK-backed Assignments ───────────────────

CREATE TABLE IF NOT EXISTS public.v34_topics (
  id              text PRIMARY KEY,
  slug            text NOT NULL UNIQUE,
  name            text NOT NULL,
  description     text NOT NULL DEFAULT '',
  parent_topic_id text REFERENCES public.v34_topics(id) ON DELETE SET NULL,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.v34_topic_assignments (
  id          text PRIMARY KEY,
  topic_id    text NOT NULL REFERENCES public.v34_topics(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('contribution', 'source', 'project', 'tool')),
  target_id   text NOT NULL,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (topic_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_v34_topic_assignments_target
  ON public.v34_topic_assignments (target_type, target_id);

-- ── 2. WorkspaceTool Bridge (Workspace access to global ToolRepository) ────

CREATE TABLE IF NOT EXISTS public.v34_workspace_tools (
  workspace_id       text NOT NULL REFERENCES public.v34_workspaces(id) ON DELETE CASCADE,
  tool_repository_id text NOT NULL REFERENCES public.v34_tool_repositories(id) ON DELETE CASCADE,
  pinned             boolean NOT NULL DEFAULT false,
  notes              text NOT NULL DEFAULT '',
  added_by           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, tool_repository_id)
);

-- ── 3. Saved Searches & Alerts ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.v34_saved_searches (
  id            text PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  query         text NOT NULL,
  filters       jsonb NOT NULL DEFAULT '{}'::jsonb,
  alert_cadence text NOT NULL DEFAULT 'off' CHECK (alert_cadence IN ('off', 'daily', 'weekly')),
  last_run_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v34_saved_searches_user
  ON public.v34_saved_searches (user_id, updated_at DESC);

-- ── 4. Citation Collections & Single-Target Collection Items ───────────────

CREATE TABLE IF NOT EXISTS public.v34_citation_collections (
  id           text PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id text REFERENCES public.v34_workspaces(id) ON DELETE SET NULL,
  name         text NOT NULL,
  description  text NOT NULL DEFAULT '',
  visibility   text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'workspace', 'public')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.v34_citation_collection_items (
  id              text PRIMARY KEY,
  collection_id   text NOT NULL REFERENCES public.v34_citation_collections(id) ON DELETE CASCADE,
  source_id       text REFERENCES public.v34_sources(id) ON DELETE CASCADE,
  contribution_id text REFERENCES public.v34_contributions(id) ON DELETE CASCADE,
  evidence_id     text REFERENCES public.v34_evidence(id) ON DELETE CASCADE,
  note            text NOT NULL DEFAULT '',
  position        integer NOT NULL DEFAULT 0,
  added_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  -- v3.4 Part VII §3: exactly one citation-collection item target
  CONSTRAINT v34_citation_item_exactly_one_target CHECK (
    (CASE WHEN source_id IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN contribution_id IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN evidence_id IS NOT NULL THEN 1 ELSE 0 END) = 1
  )
);

CREATE INDEX IF NOT EXISTS idx_v34_citation_items_collection
  ON public.v34_citation_collection_items (collection_id, position);

-- ── 5. Rebuildable Graph Read Projection (GraphNode & GraphEdge) ───────────

CREATE TABLE IF NOT EXISTS public.v34_graph_nodes (
  id                text PRIMARY KEY,
  node_type         text NOT NULL CHECK (node_type IN ('source', 'evidence', 'claim', 'contribution', 'tool', 'topic')),
  canonical_id      text NOT NULL,
  title             text NOT NULL,
  integrity_status  text NOT NULL DEFAULT 'active',
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  rebuilt_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (node_type, canonical_id)
);

CREATE TABLE IF NOT EXISTS public.v34_graph_edges (
  id             text PRIMARY KEY,
  from_node_id   text NOT NULL REFERENCES public.v34_graph_nodes(id) ON DELETE CASCADE,
  to_node_id     text NOT NULL REFERENCES public.v34_graph_nodes(id) ON DELETE CASCADE,
  relation_type  text NOT NULL,
  status         text NOT NULL DEFAULT 'ACCEPTED' CHECK (status IN ('PROPOSED', 'ACCEPTED', 'REJECTED')),
  confidence     double precision CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  inferred       boolean NOT NULL DEFAULT false,
  rebuilt_at     timestamptz NOT NULL DEFAULT now(),
  -- v3.4 Part VII §3: no self graph edge
  CONSTRAINT v34_graph_edges_no_self_edge CHECK (from_node_id <> to_node_id)
);

CREATE INDEX IF NOT EXISTS idx_v34_graph_edges_from ON public.v34_graph_edges (from_node_id);
CREATE INDEX IF NOT EXISTS idx_v34_graph_edges_to   ON public.v34_graph_edges (to_node_id);

-- ── 6. Research Goal Lifecycle Timestamps & Event-Derived Progress Log ─────

ALTER TABLE public.v34_research_goals
  ADD COLUMN IF NOT EXISTS paused_at   timestamptz,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE TABLE IF NOT EXISTS public.v34_goal_progress_events (
  id          text PRIMARY KEY,
  goal_id     text NOT NULL REFERENCES public.v34_research_goals(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta       integer NOT NULL CHECK (delta > 0),
  source_kind text NOT NULL DEFAULT 'manual-verified',
  object_type text,
  object_id   text,
  note        text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v34_goal_progress_goal
  ON public.v34_goal_progress_events (goal_id, created_at DESC);

-- ── Row Level Security Policies (zero service-role bypass) ─────────────────

ALTER TABLE public.v34_topics                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_topic_assignments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_workspace_tools           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_saved_searches            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_citation_collections      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_citation_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_graph_nodes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_graph_edges               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v34_goal_progress_events      ENABLE ROW LEVEL SECURITY;

-- Topics: publicly readable, authenticated users can propose/assign
DROP POLICY IF EXISTS v34_topics_read ON public.v34_topics;
CREATE POLICY v34_topics_read ON public.v34_topics FOR SELECT USING (true);

DROP POLICY IF EXISTS v34_topics_write ON public.v34_topics;
CREATE POLICY v34_topics_write ON public.v34_topics
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS v34_topic_assignments_read ON public.v34_topic_assignments;
CREATE POLICY v34_topic_assignments_read ON public.v34_topic_assignments FOR SELECT USING (true);

DROP POLICY IF EXISTS v34_topic_assignments_write ON public.v34_topic_assignments;
CREATE POLICY v34_topic_assignments_write ON public.v34_topic_assignments
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- WorkspaceTools: workspace members only
DROP POLICY IF EXISTS v34_workspace_tools_read ON public.v34_workspace_tools;
CREATE POLICY v34_workspace_tools_read ON public.v34_workspace_tools
  FOR SELECT USING (public.v34_is_workspace_member(workspace_id));

DROP POLICY IF EXISTS v34_workspace_tools_write ON public.v34_workspace_tools;
CREATE POLICY v34_workspace_tools_write ON public.v34_workspace_tools
  FOR ALL USING (public.v34_is_workspace_member(workspace_id))
  WITH CHECK (public.v34_is_workspace_member(workspace_id));

-- Saved searches: strictly owner-only
DROP POLICY IF EXISTS v34_saved_searches_owner ON public.v34_saved_searches;
CREATE POLICY v34_saved_searches_owner ON public.v34_saved_searches
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Citation collections: owner, workspace members (for workspace visibility), or public
DROP POLICY IF EXISTS v34_citation_collections_read ON public.v34_citation_collections;
CREATE POLICY v34_citation_collections_read ON public.v34_citation_collections
  FOR SELECT USING (
    visibility = 'public'
    OR user_id = auth.uid()
    OR (visibility = 'workspace' AND workspace_id IS NOT NULL AND public.v34_is_workspace_member(workspace_id))
  );

DROP POLICY IF EXISTS v34_citation_collections_write ON public.v34_citation_collections;
CREATE POLICY v34_citation_collections_write ON public.v34_citation_collections
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS v34_citation_items_read ON public.v34_citation_collection_items;
CREATE POLICY v34_citation_items_read ON public.v34_citation_collection_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.v34_citation_collections c
      WHERE c.id = collection_id
        AND (
          c.visibility = 'public'
          OR c.user_id = auth.uid()
          OR (c.visibility = 'workspace' AND c.workspace_id IS NOT NULL AND public.v34_is_workspace_member(c.workspace_id))
        )
    )
  );

DROP POLICY IF EXISTS v34_citation_items_write ON public.v34_citation_collection_items;
CREATE POLICY v34_citation_items_write ON public.v34_citation_collection_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.v34_citation_collections c
      WHERE c.id = collection_id AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.v34_citation_collections c
      WHERE c.id = collection_id AND c.user_id = auth.uid()
    )
  );

-- Graph read projections: publicly readable, authenticated rebuild allowed
DROP POLICY IF EXISTS v34_graph_nodes_read ON public.v34_graph_nodes;
CREATE POLICY v34_graph_nodes_read ON public.v34_graph_nodes FOR SELECT USING (true);

DROP POLICY IF EXISTS v34_graph_nodes_write ON public.v34_graph_nodes;
CREATE POLICY v34_graph_nodes_write ON public.v34_graph_nodes
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS v34_graph_edges_read ON public.v34_graph_edges;
CREATE POLICY v34_graph_edges_read ON public.v34_graph_edges FOR SELECT USING (true);

DROP POLICY IF EXISTS v34_graph_edges_write ON public.v34_graph_edges;
CREATE POLICY v34_graph_edges_write ON public.v34_graph_edges
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Goal progress events: strictly owner-only
DROP POLICY IF EXISTS v34_goal_progress_owner ON public.v34_goal_progress_events;
CREATE POLICY v34_goal_progress_owner ON public.v34_goal_progress_events
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
