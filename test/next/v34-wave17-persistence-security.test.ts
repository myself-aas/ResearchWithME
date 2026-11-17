import fs from 'node:fs';
import path from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  authorize,
  authorizedClassificationsForActor,
  requireAuthorized,
} from '@/lib/v34/authz';
import { handleV34Error } from '@/lib/v34/http';
import { resetIdempotencyStoreForTesting, runWithIdempotency } from '@/lib/v34/idempotency';
import { executeUnifiedSearch } from '@/lib/v34/search';
import {
  autosaveDraftAtomic,
  listClaims,
  listContributions,
  listEvidence,
  listSources,
  resetV34StoreForTesting,
} from '@/lib/v34/store';
import {
  resetSupabaseCircuitForTesting,
  runSupabaseMutation,
  setStrictPersistenceOverrideForTesting,
  SupabasePersistenceError,
} from '@/lib/v34/supabase-sync';
import {
  listFormalReviews,
  listProjects,
  listWorkspaces,
  resetWave2StoreForTesting,
} from '@/lib/v34/wave2-store';
import { listToolRepositories, resetWave3StoreForTesting } from '@/lib/v34/wave3-store';
import { listTopics, resetWave5StoreForTesting } from '@/lib/v34/wave5-store';

const TEST_UUID = '11111111-2222-4333-8444-555555555555';

function makeMockQuerySupabase(rows: Record<string, unknown>[]): SupabaseClient {
  const chain = {
    select: () => chain,
    order: () => chain,
    limit: () => Promise.resolve({ data: rows, error: null }),
    eq: () => chain,
    maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
  };
  return {
    from: () => chain,
  } as unknown as SupabaseClient;
}

function walkFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
}

describe('v3.4 Wave 17 — P0 Stateless Persistence, Atomic Autosave & Security Hardening', () => {
  afterEach(() => {
    setStrictPersistenceOverrideForTesting(null);
    resetSupabaseCircuitForTesting();
    resetIdempotencyStoreForTesting();
    resetV34StoreForTesting();
    resetWave2StoreForTesting();
    resetWave3StoreForTesting();
    resetWave5StoreForTesting();
  });

  it('never merges in-memory demo seeds into live Supabase reads (even when remote returns 0 rows)', async () => {
    const emptySb = makeMockQuerySupabase([]);

    const [sources, workspaces, projects, tools, topics] = await Promise.all([
      listSources(emptySb),
      listWorkspaces(emptySb),
      listProjects({ supabase: emptySb }),
      listToolRepositories({ supabase: emptySb }),
      listTopics(emptySb),
    ]);

    expect(sources).toEqual([]);
    expect(workspaces).toEqual([]);
    expect(projects).toEqual([]);
    expect(tools).toEqual([]);
    expect(topics).toEqual([]);

    const oneSourceSb = makeMockQuerySupabase([
      {
        id: 'src-live-only',
        source_type: 'paper',
        title: 'Live Production Paper',
        authors: ['A. Researcher'],
        venue: 'NeurIPS',
        access_state: 'open',
        integrity_status: 'active',
        language: 'en',
        created_at: '2026-11-16T00:00:00.000Z',
        updated_at: '2026-11-16T00:00:00.000Z',
      },
    ]);
    const liveSources = await listSources(oneSourceSb);
    expect(liveSources).toHaveLength(1);
    expect(liveSources[0].id).toBe('src-live-only');
  });

  it('strips hardcoded demo seeds from synchronous stores and search in strict persistence mode', async () => {
    // Baseline local demo mode has starter seeds
    expect(listContributions().length).toBeGreaterThan(0);
    expect(listEvidence().length).toBeGreaterThan(0);
    expect(listClaims().length).toBeGreaterThan(0);
    expect(listFormalReviews().length).toBeGreaterThan(0);

    setStrictPersistenceOverrideForTesting(true);
    expect(listContributions()).toEqual([]);
    expect(listEvidence()).toEqual([]);
    expect(listClaims()).toEqual([]);
    expect(listFormalReviews()).toEqual([]);

    const strictSearch = await executeUnifiedSearch({ query: 'reasoning' });
    expect(strictSearch.engine).toBe('postgres-fts-trigram');
    expect(strictSearch.hits).toEqual([]);
  });

  it('fails closed on Supabase write failures with typed HTTP status codes', async () => {
    const rlsClient = {} as SupabaseClient;
    await expect(
      runSupabaseMutation(
        rlsClient,
        async () => ({ error: { message: 'new row violates row-level security policy', code: '42501' } }),
        { operation: 'v34_drafts.upsert' },
      ),
    ).rejects.toMatchObject({
      name: 'SupabasePersistenceError',
      status: 403,
      code: 'PERSISTENCE_FORBIDDEN',
    });

    await expect(
      runSupabaseMutation(
        rlsClient,
        async () => ({ error: { message: 'duplicate key value violates unique constraint', code: '23505' } }),
        { operation: 'v34_sources.insert' },
      ),
    ).rejects.toMatchObject({
      status: 409,
      code: 'PERSISTENCE_CONFLICT',
    });

    let capturedError: unknown;
    try {
      await runSupabaseMutation(
        rlsClient,
        async () => ({ error: { message: 'TypeError: fetch failed (ECONNRESET)' } }),
        { operation: 'v34_contributions.upsert' },
      );
    } catch (err) {
      capturedError = err;
    }
    expect(capturedError).toBeInstanceOf(SupabasePersistenceError);
    const httpRes = handleV34Error(capturedError);
    expect(httpRes.status).toBe(503);
    const body = (await httpRes.json()) as { code: string };
    expect(body.code).toBe('PERSISTENCE_UNAVAILABLE');

    resetSupabaseCircuitForTesting();
    setStrictPersistenceOverrideForTesting(true);
    await expect(
      runSupabaseMutation(null, async () => ({ error: null }), { operation: 'v34_drafts.upsert' }),
    ).rejects.toMatchObject({ status: 503, code: 'PERSISTENCE_UNAVAILABLE' });
  });

  it('executes atomic Postgres draft autosave RPC for commit, replay, conflict, and fail-closed errors', async () => {
    const sampleDoc = {
      schemaVersion: '1.0' as const,
      id: 'draft-atomic-1',
      title: 'Atomic Draft',
      authorId: TEST_UUID,
      workspaceId: 'ws-1',
      version: 1,
      createdAt: '2026-11-16T00:00:00.000Z',
      updatedAt: '2026-11-16T00:00:00.000Z',
      blocks: [
        {
          id: 'blk-1',
          type: 'paragraph' as const,
          text: 'Atomic transactional body.',
        },
      ],
    };

    const rpcMock = vi.fn().mockResolvedValueOnce({
      data: {
        ok: true,
        status: 200,
        replayed: false,
        snapshotId: 'snap-abc123',
        draft: {
          id: 'draft-atomic-1',
          authorId: TEST_UUID,
          contributionType: 'paper-review',
          title: 'Atomic Draft',
          document: sampleDoc,
          mdx: 'Atomic transactional body.',
          version: 1,
          lastMutationId: 'mut-1',
          createdAt: '2026-11-16T00:00:00.000Z',
          updatedAt: '2026-11-16T00:00:00.000Z',
        },
      },
      error: null,
    });

    const sb = { rpc: rpcMock } as unknown as SupabaseClient;
    const saved = await autosaveDraftAtomic({
      draftId: 'draft-atomic-1',
      authorId: TEST_UUID,
      mutationId: 'mut-1',
      baseVersion: 0,
      contributionType: 'paper-review',
      title: 'Atomic Draft',
      document: sampleDoc,
      reason: 'manual',
      supabase: sb,
    });

    expect(rpcMock).toHaveBeenCalledWith(
      'v34_autosave_draft_atomic',
      expect.objectContaining({
        p_draft_id: 'draft-atomic-1',
        p_mutation_id: 'mut-1',
        p_base_version: 0,
      }),
    );
    expect(saved.ok).toBe(true);
    if (saved.ok) {
      expect(saved.storage).toBe('postgres');
      expect(saved.draft.version).toBe(1);
    }

    // Version conflict returned cleanly without overwriting
    rpcMock.mockResolvedValueOnce({
      data: {
        ok: false,
        status: 409,
        code: 'DRAFT_CONFLICT',
        error: 'Version conflict: server is at v2, client sent baseVersion v1.',
        conflict: {
          baseVersion: 1,
          serverVersion: 2,
          serverDraft: {
            id: 'draft-atomic-1',
            authorId: TEST_UUID,
            contributionType: 'paper-review',
            title: 'Server Newer Draft',
            document: { ...sampleDoc, version: 2 },
            mdx: 'Server newer',
            version: 2,
            lastMutationId: 'mut-2',
            createdAt: '2026-11-16T00:00:00.000Z',
            updatedAt: '2026-11-16T00:01:00.000Z',
          },
        },
      },
      error: null,
    });

    const conflict = await autosaveDraftAtomic({
      draftId: 'draft-atomic-1',
      authorId: TEST_UUID,
      mutationId: 'mut-stale',
      baseVersion: 1,
      contributionType: 'paper-review',
      title: 'Stale Client',
      document: sampleDoc,
      reason: 'interval',
      supabase: sb,
    });
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) {
      expect(conflict.status).toBe(409);
      expect(conflict.conflict?.serverVersion).toBe(2);
    }

    // Transport failure fails closed
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'fetch failed' },
    });
    await expect(
      autosaveDraftAtomic({
        draftId: 'draft-atomic-1',
        authorId: TEST_UUID,
        mutationId: 'mut-fail',
        baseVersion: 2,
        contributionType: 'paper-review',
        title: 'Fail Closed',
        document: sampleDoc,
        reason: 'manual',
        supabase: sb,
      }),
    ).rejects.toMatchObject({ status: 503, code: 'PERSISTENCE_UNAVAILABLE' });
  });

  it('backs retryable idempotency durably via v34_idempotency_lookup & v34_idempotency_store RPCs', async () => {
    const ledger = new Map<
      string,
      {
        mutation_id: string;
        request_fingerprint: string;
        http_status: number;
        content_type: string;
        response_body: string;
        response_payload: unknown;
        created_at: string;
      }
    >();

    const sb = {
      rpc: vi.fn(async (fn: string, params: Record<string, unknown>) => {
        if (fn === 'v34_idempotency_lookup') {
          const hit = ledger.get(String(params.p_composite_key));
          return { data: hit ? [hit] : [], error: null };
        }
        if (fn === 'v34_idempotency_store') {
          const k = String(params.p_composite_key);
          if (!ledger.has(k)) {
            ledger.set(k, {
              mutation_id: k,
              request_fingerprint: String(params.p_fingerprint),
              http_status: Number(params.p_http_status),
              content_type: String(params.p_content_type),
              response_body: String(params.p_response_body),
              response_payload: params.p_response_payload,
              created_at: new Date().toISOString(),
            });
            return { data: { stored: true, conflict: false }, error: null };
          }
          return { data: { stored: false, conflict: false }, error: null };
        }
        return { data: null, error: null };
      }),
    } as unknown as SupabaseClient;

    let execCount = 0;
    const req1 = new Request('http://localhost/api/contributions', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'durable-key-001' },
    });
    const res1 = await runWithIdempotency(
      req1,
      {
        scope: 'POST:/api/contributions',
        actorId: TEST_UUID,
        payloadHashInput: { title: 'Durable Write' },
        supabase: sb,
      },
      async () => {
        execCount += 1;
        return NextResponse.json({ id: 'contrib-durable-1' }, { status: 201 });
      },
    );
    expect(res1.status).toBe(201);
    expect(res1.headers.get('X-Idempotency-Storage')).toBe('postgres');
    expect(execCount).toBe(1);

    // Clear process-local cache to simulate a brand new Worker isolate
    resetIdempotencyStoreForTesting();

    const req2 = new Request('http://localhost/api/contributions', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'durable-key-001' },
    });
    const res2 = await runWithIdempotency(
      req2,
      {
        scope: 'POST:/api/contributions',
        actorId: TEST_UUID,
        payloadHashInput: { title: 'Durable Write' },
        supabase: sb,
      },
      async () => {
        execCount += 1;
        return NextResponse.json({ id: 'should-not-run' }, { status: 201 });
      },
    );
    expect(res2.status).toBe(201);
    expect(res2.headers.get('X-Idempotency-Replayed')).toBe('true');
    expect(res2.headers.get('X-Idempotency-Storage')).toBe('postgres');
    expect(execCount).toBe(1);

    // Different payload with same key -> 409 IDEMPOTENCY_CONFLICT
    const req3 = new Request('http://localhost/api/contributions', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'durable-key-001' },
    });
    const res3 = await runWithIdempotency(
      req3,
      {
        scope: 'POST:/api/contributions',
        actorId: TEST_UUID,
        payloadHashInput: { title: 'Different Payload' },
        supabase: sb,
      },
      async () => NextResponse.json({ id: 'nope' }, { status: 201 }),
    );
    expect(res3.status).toBe(409);
  });

  it('executes native Postgres FTS/trigram search RPC via v34_unified_search', async () => {
    const rpcMock = vi.fn().mockResolvedValueOnce({
      data: [
        {
          id: 'src-pg-1',
          entity_type: 'source',
          title: 'GRPO Reinforcement Learning',
          snippet: 'arXiv · 2501.12948',
          url: '/source/src-pg-1',
          mode: 'lexical',
          match_reason: 'PostgreSQL full-text search match on source metadata',
          score: 18.4,
          integrity_status: 'active',
          access_state: 'open',
          language: 'en',
          identifiers: ['2501.12948'],
          topics: [],
          updated_at: '2026-11-16T00:00:00.000Z',
        },
      ],
      error: null,
    });
    const sb = { rpc: rpcMock } as unknown as SupabaseClient;

    const result = await executeUnifiedSearch({
      query: 'GRPO reasoning',
      types: ['source', 'contribution'],
      integrity: 'active',
      supabase: sb,
    });

    expect(rpcMock).toHaveBeenCalledWith(
      'v34_unified_search',
      expect.objectContaining({
        p_query: 'GRPO reasoning',
        p_types: ['source', 'contribution'],
        p_integrity: 'active',
        p_classifications: ['public'],
      }),
    );
    expect(result.engine).toBe('postgres-fts-trigram');
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].id).toBe('src-pg-1');
  });

  it('enforces centralized RBAC and data-classification boundaries via authorize()', () => {
    // Anonymous actor: PUBLIC read OK, non-PUBLIC or write denied 401
    expect(authorize(null, 'source:read', { kind: 'source', classification: 'PUBLIC' }).allowed).toBe(true);
    expect(authorize(null, 'project:read', { kind: 'project', classification: 'WORKSPACE' })).toMatchObject({
      allowed: false,
      status: 401,
      code: 'CLASSIFICATION_DENIED',
    });
    expect(authorize(null, 'contribution:write', { kind: 'contribution' })).toMatchObject({
      allowed: false,
      status: 401,
      code: 'UNAUTHORIZED',
    });
    expect(authorizedClassificationsForActor(null)).toEqual(['PUBLIC']);

    // Authenticated non-member contributor
    const contribActor = { id: 'user-a', isEditor: false, mode: 'supabase' as const };
    expect(
      authorize(contribActor, 'project:read', {
        kind: 'project',
        workspaceId: 'ws-1',
        classification: 'WORKSPACE',
        isWorkspaceMember: false,
      }),
    ).toMatchObject({ allowed: false, status: 403, code: 'CLASSIFICATION_DENIED' });

    expect(
      authorize(contribActor, 'draft:write', {
        kind: 'draft',
        ownerId: 'user-other',
        classification: 'CONFIDENTIAL',
      }),
    ).toMatchObject({ allowed: false, status: 403 });

    // Workspace VIEWER cannot write projects or invite members
    const viewerDecision = requireAuthorized(contribActor, 'project:write', {
      kind: 'project',
      workspaceId: 'ws-1',
      workspaceRole: 'VIEWER',
      isWorkspaceMember: true,
      classification: 'WORKSPACE',
    });
    expect(viewerDecision.ok).toBe(false);
    if (!viewerDecision.ok) expect(viewerDecision.response.status).toBe(403);

    // Non-editor cannot record integrity events or make editorial decisions without assignment
    expect(
      authorize(contribActor, 'source:integrity:write', { kind: 'source', classification: 'PUBLIC' }),
    ).toMatchObject({ allowed: false, status: 403, code: 'FORBIDDEN' });

    // Assigned reviewer can record decision on confidential review
    expect(
      authorize(contribActor, 'review:decide', {
        kind: 'review',
        isAssignedReviewer: true,
        classification: 'CONFIDENTIAL',
      }).allowed,
    ).toBe(true);

    // Site editor receives all classifications
    const editor = { id: 'editor-1', isEditor: true, mode: 'supabase' as const };
    expect(authorizedClassificationsForActor(editor)).toEqual([
      'PUBLIC',
      'WORKSPACE',
      'CONFIDENTIAL',
      'RESTRICTED',
      'EMBARGOED',
    ]);
  });

  it('wires 100% of v34_* migration tables and enforces rate limiting across 100% of API routes', () => {
    const root = process.cwd();
    const migrationFiles = walkFiles(path.join(root, 'supabase', 'migrations')).filter((f) =>
      f.endsWith('.sql'),
    );
    const allTables = new Set<string>();
    for (const file of migrationFiles) {
      const sql = fs.readFileSync(file, 'utf8');
      for (const match of sql.matchAll(/CREATE TABLE IF NOT EXISTS\s+(?:public\.)?(v34_[a-z0-9_]+)/gi)) {
        allTables.add(match[1]);
      }
    }

    const sourceCode = [
      ...walkFiles(path.join(root, 'lib')),
      ...walkFiles(path.join(root, 'app')),
    ]
      .filter((f) => /\.(ts|tsx)$/.test(f) && !f.includes('__tests__'))
      .map((f) => fs.readFileSync(f, 'utf8'))
      .join('\n');

    const unusedTables = [...allTables]
      .sort()
      .filter((t) => !new RegExp(`["'\`]${t}["'\`]`).test(sourceCode));
    expect(allTables.size).toBeGreaterThanOrEqual(89);
    expect(unusedTables).toEqual([]);

    const apiRoutes = walkFiles(path.join(root, 'app', 'api')).filter((f) =>
      f.endsWith(`${path.sep}route.ts`),
    );
    const unthrottledRoutes = apiRoutes.filter(
      (f) => !/(enforceRateLimit|rateLimit\(|checkBurst\()/.test(fs.readFileSync(f, 'utf8')),
    );
    expect(apiRoutes.length).toBeGreaterThanOrEqual(160);
    expect(unthrottledRoutes).toEqual([]);
  });
});
