-- ResearchWithME v3.4 — Wave 19 Live Cutover Verification Fix (Migration 13)
-- 1. Fixes `v34_autosave_draft_atomic` pending mutation sync receipt status to `'SYNCED'`
--    matching `v34_pending_mutations_status_check` (`QUEUED`, `SYNCED`, `CONFLICT`, `DISCARDED`).
-- 2. Normalizes `v34_draft_snapshots.reason` to `('interval', 'manual', 'pre-publish', 'conflict')`
--    matching `v34_draft_snapshots_reason_check`.

CREATE OR REPLACE FUNCTION public.v34_autosave_draft_atomic(
  p_draft_id text,
  p_contribution_type v34_contribution_type,
  p_title text,
  p_document jsonb,
  p_mdx text,
  p_base_version integer,
  p_mutation_id text,
  p_fingerprint text DEFAULT NULL,
  p_reason text DEFAULT 'interval'
)
RETURNS jsonb
LANGUAGE plpgsql
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
  v_safe_reason text := CASE
    WHEN p_reason IN ('interval', 'manual', 'pre-publish', 'conflict') THEN p_reason
    ELSE 'interval'
  END;
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

  v_snapshot_id := 'snap-' || substring(md5(p_draft_id || ':' || v_next_version::text || ':' || p_mutation_id), 1, 16);
  INSERT INTO public.v34_draft_snapshots (
    id, draft_id, version, document, reason, created_at
  ) VALUES (
    v_snapshot_id, p_draft_id, v_next_version, p_document, v_safe_reason, v_now
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

  INSERT INTO public.v34_pending_mutations (
    id, user_id, draft_id, idempotency_key, operation, base_version, status, payload_sha256, created_at, resolved_at
  ) VALUES (
    'pm-' || substring(md5(v_idem_key), 1, 16),
    v_uid,
    p_draft_id,
    p_mutation_id,
    'draft.autosave',
    p_base_version,
    'SYNCED',
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

GRANT EXECUTE ON FUNCTION public.v34_autosave_draft_atomic(
  text, v34_contribution_type, text, jsonb, text, integer, text, text, text
) TO authenticated;
