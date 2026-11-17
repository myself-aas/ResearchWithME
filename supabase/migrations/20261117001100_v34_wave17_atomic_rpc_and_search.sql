-- ResearchWithME v3.4 — Migration 11 (Wave 17: Atomic Autosave RPC, Durable Idempotency & Postgres FTS/Trigram Search)
-- All functions execute as SECURITY INVOKER with fixed search_path = public so caller RLS policies remain strictly enforced.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── 1. Universal Durable Idempotency Ledger Upgrade ────────────────────────
ALTER TABLE public.v34_idempotency_keys
  ALTER COLUMN draft_id DROP NOT NULL,
  ALTER COLUMN resulting_version DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'draft.autosave',
  ADD COLUMN IF NOT EXISTS request_fingerprint text,
  ADD COLUMN IF NOT EXISTS http_status integer NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'application/json',
  ADD COLUMN IF NOT EXISTS response_body text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes');

CREATE INDEX IF NOT EXISTS v34_idempotency_keys_scope_actor_idx
  ON public.v34_idempotency_keys (scope, author_id, mutation_id);

CREATE INDEX IF NOT EXISTS v34_idempotency_keys_expires_idx
  ON public.v34_idempotency_keys (expires_at);

-- ── 2. Complete GIN FTS & Trigram Search Indexes Across All 6 Entities ─────
CREATE INDEX IF NOT EXISTS v34_projects_fts_gin_idx
  ON public.v34_projects
  USING gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(objective, '')));

CREATE INDEX IF NOT EXISTS v34_contributions_title_trgm_idx
  ON public.v34_contributions
  USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS v34_tools_name_trgm_idx
  ON public.v34_tool_repositories
  USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS v34_projects_title_trgm_idx
  ON public.v34_projects
  USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS v34_topics_name_trgm_idx
  ON public.v34_topics
  USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS v34_claims_stmt_trgm_idx
  ON public.v34_claims
  USING gin (statement gin_trgm_ops);

-- ── 3. Atomic Draft Autosave RPC (v34_drafts + v34_draft_snapshots + v34_idempotency_keys + v34_pending_mutations)
CREATE OR REPLACE FUNCTION public.v34_autosave_draft_atomic(
  p_draft_id text,
  p_contribution_type public.v34_contribution_type,
  p_title text,
  p_document jsonb,
  p_mdx text,
  p_base_version integer,
  p_mutation_id text,
  p_fingerprint text DEFAULT NULL,
  p_reason text DEFAULT 'autosave'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_existing_idem public.v34_idempotency_keys%ROWTYPE;
  v_existing_draft public.v34_drafts%ROWTYPE;
  v_next_version integer;
  v_snapshot_id text;
  v_draft_json jsonb;
  v_idem_key text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'status', 401,
      'code', 'UNAUTHORIZED',
      'error', 'Authentication required to autosave drafts.'
    );
  END IF;

  v_idem_key := 'draft.autosave:' || v_uid::text || ':' || p_draft_id || ':' || p_mutation_id;

  -- 1. Check durable idempotency ledger first
  SELECT * INTO v_existing_idem
  FROM public.v34_idempotency_keys
  WHERE mutation_id IN (v_idem_key, p_mutation_id)
    AND author_id = v_uid
  LIMIT 1;

  IF FOUND THEN
    IF p_fingerprint IS NOT NULL
       AND v_existing_idem.request_fingerprint IS NOT NULL
       AND v_existing_idem.request_fingerprint <> p_fingerprint THEN
      RETURN jsonb_build_object(
        'ok', false,
        'status', 409,
        'code', 'IDEMPOTENCY_CONFLICT',
        'error', 'Mutation ID was already used with a different draft payload.'
      );
    END IF;

    RETURN jsonb_build_object(
      'ok', true,
      'status', 200,
      'replayed', true,
      'draft', v_existing_idem.response_payload
    );
  END IF;

  -- 2. Lock existing draft row for atomic optimistic concurrency check
  SELECT * INTO v_existing_draft
  FROM public.v34_drafts
  WHERE id = p_draft_id
  FOR UPDATE;

  IF NOT FOUND THEN
    IF p_base_version <> 0 THEN
      RETURN jsonb_build_object(
        'ok', false,
        'status', 409,
        'code', 'DRAFT_CONFLICT',
        'error', 'Draft does not exist at the supplied base version.'
      );
    END IF;

    v_next_version := 1;
    INSERT INTO public.v34_drafts (
      id, author_id, contribution_type, title, document, mdx,
      version, last_mutation_id, created_at, updated_at
    ) VALUES (
      p_draft_id, v_uid, p_contribution_type, p_title, p_document, p_mdx,
      v_next_version, p_mutation_id, v_now, v_now
    )
    RETURNING * INTO v_existing_draft;
  ELSE
    IF v_existing_draft.author_id <> v_uid THEN
      RETURN jsonb_build_object(
        'ok', false,
        'status', 403,
        'code', 'FORBIDDEN',
        'error', 'You do not have permission to edit this draft.'
      );
    END IF;

    IF v_existing_draft.version <> p_base_version THEN
      RETURN jsonb_build_object(
        'ok', false,
        'status', 409,
        'code', 'DRAFT_CONFLICT',
        'error', format('Version conflict: server is at v%s, client sent baseVersion v%s.', v_existing_draft.version, p_base_version),
        'conflict', jsonb_build_object(
          'baseVersion', p_base_version,
          'serverVersion', v_existing_draft.version,
          'serverDraft', jsonb_build_object(
            'id', v_existing_draft.id,
            'authorId', v_existing_draft.author_id,
            'contributionId', v_existing_draft.contribution_id,
            'contributionType', v_existing_draft.contribution_type,
            'title', v_existing_draft.title,
            'document', v_existing_draft.document,
            'mdx', v_existing_draft.mdx,
            'version', v_existing_draft.version,
            'lastMutationId', v_existing_draft.last_mutation_id,
            'createdAt', v_existing_draft.created_at,
            'updatedAt', v_existing_draft.updated_at
          )
        )
      );
    END IF;

    v_next_version := v_existing_draft.version + 1;
    UPDATE public.v34_drafts
    SET contribution_type = p_contribution_type,
        title = p_title,
        document = p_document,
        mdx = p_mdx,
        version = v_next_version,
        last_mutation_id = p_mutation_id,
        updated_at = v_now
    WHERE id = p_draft_id
    RETURNING * INTO v_existing_draft;
  END IF;

  -- 3. Atomically record immutable snapshot in v34_draft_snapshots
  v_snapshot_id := 'snap-' || substring(md5(p_draft_id || ':' || v_next_version::text || ':' || p_mutation_id), 1, 16);
  INSERT INTO public.v34_draft_snapshots (
    id, draft_id, version, document, reason, created_at
  ) VALUES (
    v_snapshot_id, p_draft_id, v_next_version, p_document, coalesce(nullif(p_reason, ''), 'autosave'), v_now
  )
  ON CONFLICT (id) DO NOTHING;

  v_draft_json := jsonb_build_object(
    'id', v_existing_draft.id,
    'authorId', v_existing_draft.author_id,
    'contributionId', v_existing_draft.contribution_id,
    'contributionType', v_existing_draft.contribution_type,
    'title', v_existing_draft.title,
    'document', v_existing_draft.document,
    'mdx', v_existing_draft.mdx,
    'version', v_existing_draft.version,
    'lastMutationId', v_existing_draft.last_mutation_id,
    'createdAt', v_existing_draft.created_at,
    'updatedAt', v_existing_draft.updated_at
  );

  -- 4. Atomically persist durable idempotency receipt
  INSERT INTO public.v34_idempotency_keys (
    mutation_id, draft_id, author_id, resulting_version, response_payload,
    scope, request_fingerprint, http_status, content_type, response_body, expires_at
  ) VALUES (
    v_idem_key, p_draft_id, v_uid, v_next_version, v_draft_json,
    'draft.autosave', p_fingerprint, 200, 'application/json',
    jsonb_build_object('draft', v_draft_json, 'replayed', false)::text,
    v_now + interval '24 hours'
  )
  ON CONFLICT (mutation_id) DO NOTHING;

  -- 5. Atomically record resolved offline/client sync receipt in v34_pending_mutations
  INSERT INTO public.v34_pending_mutations (
    id, user_id, draft_id, idempotency_key, operation, base_version, status, payload_sha256, created_at, resolved_at
  ) VALUES (
    'pm-' || substring(md5(v_idem_key), 1, 16),
    v_uid,
    p_draft_id,
    p_mutation_id,
    'draft.autosave',
    p_base_version,
    'resolved',
    coalesce(p_fingerprint, md5(coalesce(p_mdx, ''))),
    v_now,
    v_now
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN jsonb_build_object(
    'ok', true,
    'status', 200,
    'replayed', false,
    'snapshotId', v_snapshot_id,
    'draft', v_draft_json
  );
END;
$$;

-- ── 4. Durable API Idempotency Lookup & Store RPCs ─────────────────────────
CREATE OR REPLACE FUNCTION public.v34_idempotency_lookup(
  p_scope text,
  p_composite_key text
)
RETURNS TABLE (
  mutation_id text,
  request_fingerprint text,
  http_status integer,
  content_type text,
  response_body text,
  response_payload jsonb,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    k.mutation_id,
    k.request_fingerprint,
    k.http_status,
    k.content_type,
    k.response_body,
    k.response_payload,
    k.created_at
  FROM public.v34_idempotency_keys k
  WHERE k.mutation_id = p_composite_key
    AND k.scope = p_scope
    AND k.author_id = auth.uid()
    AND k.expires_at > now()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.v34_idempotency_store(
  p_composite_key text,
  p_scope text,
  p_fingerprint text,
  p_http_status integer,
  p_content_type text,
  p_response_body text,
  p_response_payload jsonb DEFAULT '{}'::jsonb,
  p_draft_id text DEFAULT NULL,
  p_resulting_version integer DEFAULT NULL,
  p_ttl_seconds integer DEFAULT 900
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_existing public.v34_idempotency_keys%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('stored', false, 'reason', 'unauthenticated');
  END IF;

  INSERT INTO public.v34_idempotency_keys (
    mutation_id, draft_id, author_id, resulting_version, response_payload,
    scope, request_fingerprint, http_status, content_type, response_body, expires_at
  ) VALUES (
    p_composite_key,
    p_draft_id,
    v_uid,
    p_resulting_version,
    coalesce(p_response_payload, '{}'::jsonb),
    p_scope,
    p_fingerprint,
    p_http_status,
    coalesce(nullif(p_content_type, ''), 'application/json'),
    p_response_body,
    now() + make_interval(secs => greatest(60, least(p_ttl_seconds, 86400)))
  )
  ON CONFLICT (mutation_id) DO NOTHING;

  IF FOUND THEN
    RETURN jsonb_build_object('stored', true, 'conflict', false);
  END IF;

  SELECT * INTO v_existing
  FROM public.v34_idempotency_keys
  WHERE mutation_id = p_composite_key
    AND author_id = v_uid;

  IF FOUND AND v_existing.request_fingerprint IS DISTINCT FROM p_fingerprint THEN
    RETURN jsonb_build_object('stored', false, 'conflict', true);
  END IF;

  RETURN jsonb_build_object('stored', false, 'conflict', false);
END;
$$;

-- ── 5. Native PostgreSQL FTS + Trigram Unified Search RPC ──────────────────
CREATE OR REPLACE FUNCTION public.v34_unified_search(
  p_query text DEFAULT '',
  p_types text[] DEFAULT ARRAY['source','contribution','tool','project','claim','topic'],
  p_integrity text DEFAULT NULL,
  p_access text DEFAULT NULL,
  p_language text DEFAULT NULL,
  p_topic text DEFAULT NULL,
  p_classifications text[] DEFAULT ARRAY['public'],
  p_identifier_scheme text DEFAULT NULL,
  p_identifier_value text DEFAULT NULL,
  p_limit integer DEFAULT 40
)
RETURNS TABLE (
  id text,
  entity_type text,
  title text,
  snippet text,
  url text,
  mode text,
  match_reason text,
  score double precision,
  integrity_status text,
  access_state text,
  language text,
  identifiers text[],
  topics text[],
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_q text := trim(coalesce(p_query, ''));
  v_tsq tsquery := NULL;
  v_allowed_types text[] := coalesce(p_types, ARRAY['source','contribution','tool','project','claim','topic']);
  v_allowed_cls text[] := ARRAY(SELECT lower(x) FROM unnest(coalesce(p_classifications, ARRAY['public'])) AS x);
  v_limit integer := greatest(1, least(coalesce(p_limit, 40), 100));
  v_topic text := nullif(lower(trim(coalesce(p_topic, ''))), '');
  v_integrity text := nullif(lower(trim(coalesce(p_integrity, ''))), '');
  v_access text := nullif(lower(trim(coalesce(p_access, ''))), '');
  v_lang text := nullif(lower(trim(coalesce(p_language, ''))), '');
BEGIN
  IF v_q <> '' THEN
    v_tsq := websearch_to_tsquery('english', v_q);
  END IF;

  RETURN QUERY
  WITH ranked AS (
    -- Sources (FTS + trigram + exact normalized identifier)
    SELECT
      s.id,
      'source'::text AS entity_type,
      s.title,
      concat_ws(' · ', s.venue, s.identifier_value) AS snippet,
      '/source/' || s.id AS url,
      CASE
        WHEN p_identifier_value IS NOT NULL
             AND lower(coalesce(s.identifier_value, '')) = lower(p_identifier_value)
             AND (p_identifier_scheme IS NULL OR lower(coalesce(s.identifier_scheme, '')) = lower(p_identifier_scheme))
          THEN 'identifier'
        ELSE 'lexical'
      END AS mode,
      CASE
        WHEN p_identifier_value IS NOT NULL
             AND lower(coalesce(s.identifier_value, '')) = lower(p_identifier_value)
          THEN 'Exact normalized ' || upper(coalesce(s.identifier_scheme, 'ID')) || ' identifier match (Postgres)'
        WHEN v_tsq IS NOT NULL
             AND to_tsvector('english', coalesce(s.title,'') || ' ' || coalesce(s.venue,'') || ' ' || coalesce(s.identifier_value,'')) @@ v_tsq
          THEN 'PostgreSQL full-text search match on source metadata'
        WHEN v_q <> '' AND similarity(s.title, v_q) >= 0.15
          THEN 'PostgreSQL trigram similarity match on source title'
        ELSE 'Recent indexed source'
      END AS match_reason,
      CASE
        WHEN p_identifier_value IS NOT NULL
             AND lower(coalesce(s.identifier_value, '')) = lower(p_identifier_value)
          THEN 100.0::double precision
        WHEN v_tsq IS NOT NULL
          THEN (
            ts_rank_cd(
              to_tsvector('english', coalesce(s.title,'') || ' ' || coalesce(s.venue,'') || ' ' || coalesce(s.identifier_value,'')),
              v_tsq
            ) * 20.0 + similarity(s.title, v_q) * 10.0
          )::double precision
        ELSE 1.0::double precision
      END AS score,
      s.integrity_status::text AS integrity_status,
      s.access_state::text AS access_state,
      s.language::text AS language,
      array_remove(ARRAY[s.identifier_value, s.canonical_url], NULL) AS identifiers,
      ARRAY[]::text[] AS topics,
      s.updated_at
    FROM public.v34_sources s
    WHERE 'source' = ANY(v_allowed_types)
      AND lower(s.classification::text) = ANY(v_allowed_cls)
      AND (v_integrity IS NULL OR lower(s.integrity_status::text) = v_integrity)
      AND (v_access IS NULL OR lower(s.access_state::text) = v_access)
      AND (v_lang IS NULL OR lower(s.language::text) = v_lang)
      AND (
        v_q = ''
        OR (p_identifier_value IS NOT NULL AND lower(coalesce(s.identifier_value, '')) = lower(p_identifier_value))
        OR to_tsvector('english', coalesce(s.title,'') || ' ' || coalesce(s.venue,'') || ' ' || coalesce(s.identifier_value,'')) @@ v_tsq
        OR similarity(s.title, v_q) >= 0.15
      )

    UNION ALL

    -- Contributions (FTS + trigram)
    SELECT
      c.id,
      'contribution'::text AS entity_type,
      c.title,
      c.summary AS snippet,
      '/contribution/' || c.id AS url,
      'lexical'::text AS mode,
      CASE
        WHEN v_tsq IS NOT NULL
             AND to_tsvector('english', coalesce(c.title,'') || ' ' || coalesce(c.summary,'')) @@ v_tsq
          THEN 'PostgreSQL full-text search match on contribution'
        WHEN v_q <> '' AND similarity(c.title, v_q) >= 0.15
          THEN 'PostgreSQL trigram similarity match on contribution title'
        ELSE 'Recent published contribution'
      END AS match_reason,
      CASE
        WHEN v_tsq IS NOT NULL
          THEN (
            ts_rank_cd(to_tsvector('english', coalesce(c.title,'') || ' ' || coalesce(c.summary,'')), v_tsq) * 20.0
            + similarity(c.title, v_q) * 10.0
          )::double precision
        ELSE 1.0::double precision
      END AS score,
      coalesce(c.trust_assessment->>'sourceIntegrity', 'active') AS integrity_status,
      'open'::text AS access_state,
      'en'::text AS language,
      array_remove(ARRAY[c.primary_source_id], NULL) AS identifiers,
      coalesce(c.topics, ARRAY[]::text[]) AS topics,
      c.updated_at
    FROM public.v34_contributions c
    WHERE 'contribution' = ANY(v_allowed_types)
      AND c.lifecycle = 'published'
      AND lower(c.classification::text) = ANY(v_allowed_cls)
      AND (v_integrity IS NULL OR lower(coalesce(c.trust_assessment->>'sourceIntegrity', 'active')) = v_integrity)
      AND (v_access IS NULL OR v_access = 'open')
      AND (v_lang IS NULL OR v_lang = 'en')
      AND (v_topic IS NULL OR EXISTS (SELECT 1 FROM unnest(coalesce(c.topics, ARRAY[]::text[]) || coalesce(c.tags, ARRAY[]::text[])) t WHERE lower(t) LIKE '%' || v_topic || '%'))
      AND (
        v_q = ''
        OR to_tsvector('english', coalesce(c.title,'') || ' ' || coalesce(c.summary,'')) @@ v_tsq
        OR similarity(c.title, v_q) >= 0.15
      )

    UNION ALL

    -- Tool Repositories (FTS + trigram)
    SELECT
      tr.id,
      'tool'::text AS entity_type,
      tr.name AS title,
      tr.summary AS snippet,
      '/tool/' || tr.slug AS url,
      'lexical'::text AS mode,
      CASE
        WHEN v_tsq IS NOT NULL
             AND to_tsvector('english', coalesce(tr.name,'') || ' ' || coalesce(tr.summary,'')) @@ v_tsq
          THEN 'PostgreSQL full-text search match on tool repository'
        WHEN v_q <> '' AND similarity(tr.name, v_q) >= 0.15
          THEN 'PostgreSQL trigram similarity match on tool name'
        ELSE 'Recent indexed tool'
      END AS match_reason,
      CASE
        WHEN v_tsq IS NOT NULL
          THEN (
            ts_rank_cd(to_tsvector('english', coalesce(tr.name,'') || ' ' || coalesce(tr.summary,'')), v_tsq) * 20.0
            + similarity(tr.name, v_q) * 10.0
          )::double precision
        ELSE 1.0::double precision
      END AS score,
      NULL::text AS integrity_status,
      'open'::text AS access_state,
      'en'::text AS language,
      array_remove(ARRAY[tr.repository_url], NULL) AS identifiers,
      coalesce(tr.topics, ARRAY[]::text[]) AS topics,
      tr.updated_at
    FROM public.v34_tool_repositories tr
    WHERE 'tool' = ANY(v_allowed_types)
      AND 'public' = ANY(v_allowed_cls)
      AND (v_access IS NULL OR v_access = 'open')
      AND (v_topic IS NULL OR EXISTS (SELECT 1 FROM unnest(coalesce(tr.topics, ARRAY[]::text[])) t WHERE lower(t) LIKE '%' || v_topic || '%'))
      AND (
        v_q = ''
        OR to_tsvector('english', coalesce(tr.name,'') || ' ' || coalesce(tr.summary,'')) @@ v_tsq
        OR similarity(tr.name, v_q) >= 0.15
      )

    UNION ALL

    -- Projects (FTS + trigram + classification guard)
    SELECT
      p.id,
      'project'::text AS entity_type,
      p.title,
      p.objective AS snippet,
      '/project/' || p.slug AS url,
      'lexical'::text AS mode,
      CASE
        WHEN v_tsq IS NOT NULL
             AND to_tsvector('english', coalesce(p.title,'') || ' ' || coalesce(p.objective,'')) @@ v_tsq
          THEN 'PostgreSQL full-text search match on research project'
        WHEN v_q <> '' AND similarity(p.title, v_q) >= 0.15
          THEN 'PostgreSQL trigram similarity match on project title'
        ELSE 'Recent research project'
      END AS match_reason,
      CASE
        WHEN v_tsq IS NOT NULL
          THEN (
            ts_rank_cd(to_tsvector('english', coalesce(p.title,'') || ' ' || coalesce(p.objective,'')), v_tsq) * 20.0
            + similarity(p.title, v_q) * 10.0
          )::double precision
        ELSE 1.0::double precision
      END AS score,
      NULL::text AS integrity_status,
      p.visibility AS access_state,
      'en'::text AS language,
      ARRAY[]::text[] AS identifiers,
      coalesce(p.topics, ARRAY[]::text[]) AS topics,
      p.updated_at
    FROM public.v34_projects p
    WHERE 'project' = ANY(v_allowed_types)
      AND lower(p.classification::text) = ANY(v_allowed_cls)
      AND (v_topic IS NULL OR EXISTS (SELECT 1 FROM unnest(coalesce(p.topics, ARRAY[]::text[])) t WHERE lower(t) LIKE '%' || v_topic || '%'))
      AND (
        v_q = ''
        OR to_tsvector('english', coalesce(p.title,'') || ' ' || coalesce(p.objective,'')) @@ v_tsq
        OR similarity(p.title, v_q) >= 0.15
      )

    UNION ALL

    -- Claims (FTS + trigram + classification guard)
    SELECT
      cl.id,
      'claim'::text AS entity_type,
      left(cl.statement, 160) AS title,
      cl.statement AS snippet,
      '/claim/' || cl.id AS url,
      'lexical'::text AS mode,
      CASE
        WHEN v_tsq IS NOT NULL
             AND to_tsvector('english', coalesce(cl.statement,'')) @@ v_tsq
          THEN 'PostgreSQL full-text search match on claim statement'
        WHEN v_q <> '' AND similarity(cl.statement, v_q) >= 0.15
          THEN 'PostgreSQL trigram similarity match on claim statement'
        ELSE 'Recent indexed claim'
      END AS match_reason,
      CASE
        WHEN v_tsq IS NOT NULL
          THEN (
            ts_rank_cd(to_tsvector('english', coalesce(cl.statement,'')), v_tsq) * 20.0
            + similarity(cl.statement, v_q) * 10.0
          )::double precision
        ELSE 1.0::double precision
      END AS score,
      NULL::text AS integrity_status,
      'open'::text AS access_state,
      'en'::text AS language,
      ARRAY[]::text[] AS identifiers,
      ARRAY[]::text[] AS topics,
      cl.updated_at
    FROM public.v34_claims cl
    WHERE 'claim' = ANY(v_allowed_types)
      AND lower(cl.classification::text) = ANY(v_allowed_cls)
      AND (
        v_q = ''
        OR to_tsvector('english', coalesce(cl.statement,'')) @@ v_tsq
        OR similarity(cl.statement, v_q) >= 0.15
      )

    UNION ALL

    -- Topics (FTS + trigram)
    SELECT
      tp.id,
      'topic'::text AS entity_type,
      tp.name AS title,
      coalesce(tp.description, '') AS snippet,
      '/topics/' || tp.slug AS url,
      'lexical'::text AS mode,
      CASE
        WHEN v_tsq IS NOT NULL
             AND to_tsvector('english', coalesce(tp.name,'') || ' ' || coalesce(tp.description,'')) @@ v_tsq
          THEN 'PostgreSQL full-text search match on topic taxonomy'
        WHEN v_q <> '' AND similarity(tp.name, v_q) >= 0.15
          THEN 'PostgreSQL trigram similarity match on topic name'
        ELSE 'Indexed research topic'
      END AS match_reason,
      CASE
        WHEN v_tsq IS NOT NULL
          THEN (
            ts_rank_cd(to_tsvector('english', coalesce(tp.name,'') || ' ' || coalesce(tp.description,'')), v_tsq) * 20.0
            + similarity(tp.name, v_q) * 10.0
          )::double precision
        ELSE 1.0::double precision
      END AS score,
      NULL::text AS integrity_status,
      'open'::text AS access_state,
      tp.language AS language,
      ARRAY[]::text[] AS identifiers,
      ARRAY[tp.slug] AS topics,
      tp.updated_at
    FROM public.v34_topics tp
    WHERE 'topic' = ANY(v_allowed_types)
      AND 'public' = ANY(v_allowed_cls)
      AND (v_lang IS NULL OR lower(tp.language) = v_lang)
      AND (
        v_q = ''
        OR to_tsvector('english', coalesce(tp.name,'') || ' ' || coalesce(tp.description,'')) @@ v_tsq
        OR similarity(tp.name, v_q) >= 0.15
      )
  )
  SELECT *
  FROM ranked
  ORDER BY score DESC, updated_at DESC NULLS LAST
  LIMIT v_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.v34_autosave_draft_atomic(text, public.v34_contribution_type, text, jsonb, text, integer, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v34_idempotency_lookup(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v34_idempotency_store(text, text, text, integer, text, text, jsonb, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v34_unified_search(text, text[], text, text, text, text, text[], text, text, integer) TO anon, authenticated;
