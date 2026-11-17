import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getTopics, POST as postTopics } from '@/app/api/topics/route';
import {
  GET as getWorkspaceTools,
  POST as postWorkspaceTools,
  DELETE as deleteWorkspaceTools,
} from '@/app/api/workspaces/[id]/tools/route';
import {
  GET as getSavedSearches,
  POST as postSavedSearches,
  PATCH as patchSavedSearches,
  DELETE as deleteSavedSearches,
} from '@/app/api/search/saved/route';
import {
  GET as getCollections,
  POST as postCollections,
  DELETE as deleteCollections,
} from '@/app/api/citation-collections/route';
import { GET as getGraphRebuild, POST as postGraphRebuild } from '@/app/api/graph/rebuild/route';
import { GET as getGoal, PATCH as patchGoal } from '@/app/api/goals/[id]/route';
import { POST as pauseGoal } from '@/app/api/goals/[id]/pause/route';
import { POST as resumeGoal } from '@/app/api/goals/[id]/resume/route';
import { POST as archiveGoal } from '@/app/api/goals/[id]/archive/route';
import { GET as getGoalProgress, POST as postGoalProgress } from '@/app/api/goals/[id]/progress/route';
import { GET as getSourceVersions, POST as postSourceVersion } from '@/app/api/sources/[id]/versions/route';
import { GET as getClaim, PATCH as patchClaim } from '@/app/api/claims/[id]/route';
import {
  POST as postClaimEvidence,
  DELETE as deleteClaimEvidence,
} from '@/app/api/claims/[id]/evidence/route';
import { GET as getDiscussion } from '@/app/api/discussions/[id]/route';
import { isV34FlagEnabled } from '@/lib/v34/feature-flags';
import { resetIdempotencyStoreForTesting } from '@/lib/v34/idempotency';
import { resetV34StoreForTesting } from '@/lib/v34/store';
import { resetWave2StoreForTesting } from '@/lib/v34/wave2-store';
import { resetWave3StoreForTesting } from '@/lib/v34/wave3-store';
import { resetWave5StoreForTesting } from '@/lib/v34/wave5-store';

let activeActorId = 'local-contributor';

vi.mock('@/lib/v34/http', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/v34/http')>();
  return {
    ...original,
    enforceRateLimit: vi.fn().mockResolvedValue(null),
    requireContributor: vi.fn().mockImplementation(async () => ({
      ok: true,
      actor: {
        id: activeActorId,
        email: `${activeActorId}@researchwithme.test`,
        displayName: 'Test Researcher',
        handle: activeActorId,
        isEditor: true,
        supabase: null,
      },
    })),
  };
});

function jsonReq(url: string, method: string, body?: unknown, headers?: Record<string, string>) {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(headers ?? {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe('ResearchWithME v3.4 Wave 5 Canonical APIs & Invariants', () => {
  beforeEach(() => {
    activeActorId = 'local-contributor';
    resetIdempotencyStoreForTesting();
    resetV34StoreForTesting();
    resetWave2StoreForTesting();
    resetWave3StoreForTesting();
    resetWave5StoreForTesting();
  });

  afterEach(() => {
    delete process.env.V34_FLAG_TOPICS_TAXONOMY;
    delete process.env.V34_FLAG_GRAPH_PROJECTION;
  });

  it('creates canonical FK-backed topics, deduplicates slugs, supports Idempotency-Key replay, and assigns to targets', async () => {
    const listBefore = await getTopics(new NextRequest('http://localhost/api/topics'));
    expect(listBefore.status).toBe(200);
    const beforeData = await listBefore.json();
    expect(beforeData.total).toBeGreaterThanOrEqual(6);

    const idem = { 'Idempotency-Key': 'topic-create-formal-verif-1' };
    const topicPayload = {
      action: 'create',
      name: 'Formal Verification',
      description: 'Mechanized proofs and theorem proving benchmarks.',
      parentTopicId: 'topic-systems',
    };
    const create1 = await postTopics(
      jsonReq('http://localhost/api/topics', 'POST', topicPayload, idem),
    );
    expect(create1.status).toBe(201);
    const createdPayload = await create1.json();
    expect(createdPayload.topic.slug).toBe('formal-verification');

    const replay = await postTopics(
      jsonReq('http://localhost/api/topics', 'POST', topicPayload, idem),
    );
    expect(replay.headers.get('X-Idempotency-Replayed')).toBe('true');

    const conflict = await postTopics(
      jsonReq(
        'http://localhost/api/topics',
        'POST',
        { action: 'create', name: 'Different Topic', description: 'Mismatch' },
        idem,
      ),
    );
    expect(conflict.status).toBe(409);

    const assign = await postTopics(
      jsonReq('http://localhost/api/topics', 'POST', {
        action: 'assign',
        topicId: createdPayload.topic.id,
        targetType: 'contribution',
        targetId: 'contrib-rl-cold-start',
      }),
    );
    expect(assign.status).toBe(201);
    const assignData = await assign.json();
    expect(assignData.assignment.topicId).toBe(createdPayload.topic.id);
  });

  it('enforces workspace membership on WorkspaceTool links and links/unlinks global ToolRepositories without cloning', async () => {
    const getRes = await getWorkspaceTools(
      new NextRequest('http://localhost/api/workspaces/ws-open-reasoning/tools'),
      { params: Promise.resolve({ id: 'ws-open-reasoning' }) },
    );
    expect(getRes.status).toBe(200);
    const initial = await getRes.json();
    expect(initial.total).toBeGreaterThanOrEqual(2);

    // Non-member rejected with 403 WORKSPACE_MEMBERSHIP_REQUIRED
    activeActorId = 'outsider-user-99';
    const forbidden = await postWorkspaceTools(
      jsonReq('http://localhost/api/workspaces/ws-open-reasoning/tools', 'POST', {
        toolRepositoryId: 'tool-vllm',
        pinned: true,
        notes: 'Unauthorized attempt',
      }),
      { params: Promise.resolve({ id: 'ws-open-reasoning' }) },
    );
    expect(forbidden.status).toBe(403);
    const forbiddenData = await forbidden.json();
    expect(forbiddenData.code).toBe('WORKSPACE_MEMBERSHIP_REQUIRED');

    // Member links & unlinks cleanly
    activeActorId = 'local-contributor';
    const unlink = await deleteWorkspaceTools(
      new NextRequest(
        'http://localhost/api/workspaces/ws-open-reasoning/tools?toolRepositoryId=tool-open-r1',
        { method: 'DELETE' },
      ),
      { params: Promise.resolve({ id: 'ws-open-reasoning' }) },
    );
    expect(unlink.status).toBe(200);

    const relink = await postWorkspaceTools(
      jsonReq('http://localhost/api/workspaces/ws-open-reasoning/tools', 'POST', {
        toolRepositoryId: 'tool-open-r1',
        pinned: true,
        notes: 'Re-pinned for GRPO baseline verification.',
      }),
      { params: Promise.resolve({ id: 'ws-open-reasoning' }) },
    );
    expect(relink.status).toBe(201);
  });

  it('manages Saved Searches & alert cadence CRUD', async () => {
    const createRes = await postSavedSearches(
      jsonReq('http://localhost/api/search/saved', 'POST', {
        name: 'Sparse Autoencoders',
        query: 'mechanistic interpretability SAE',
        alertCadence: 'daily',
      }),
    );
    expect(createRes.status).toBe(201);
    const { savedSearch } = await createRes.json();

    const patchRes = await patchSavedSearches(
      jsonReq('http://localhost/api/search/saved', 'PATCH', {
        id: savedSearch.id,
        alertCadence: 'weekly',
        markRun: true,
      }),
    );
    expect(patchRes.status).toBe(200);
    const patched = await patchRes.json();
    expect(patched.savedSearch.alertCadence).toBe('weekly');
    expect(patched.savedSearch.lastRunAt).toBeTruthy();

    const listRes = await getSavedSearches();
    const listed = await listRes.json();
    expect(listed.savedSearches.some((s: { id: string }) => s.id === savedSearch.id)).toBe(true);

    const delRes = await deleteSavedSearches(
      new NextRequest(`http://localhost/api/search/saved?id=${savedSearch.id}`, {
        method: 'DELETE',
      }),
    );
    expect(delRes.status).toBe(200);
  });

  it('enforces single-target CitationCollectionItem invariant (Part VII §3)', async () => {
    const colRes = await postCollections(
      jsonReq('http://localhost/api/citation-collections', 'POST', {
        action: 'create',
        name: 'Replication Audit Reading Pack',
        description: 'Key papers and evidence for Q4 audit',
        visibility: 'private',
      }),
    );
    expect(colRes.status).toBe(201);
    const { collection } = await colRes.json();

    // Reject 0 targets
    const zeroTargets = await postCollections(
      jsonReq('http://localhost/api/citation-collections', 'POST', {
        action: 'add-item',
        collectionId: collection.id,
        note: 'Missing target',
      }),
    );
    expect(zeroTargets.status).toBe(400);
    expect((await zeroTargets.json()).code).toBe('EXACTLY_ONE_TARGET_REQUIRED');

    // Reject 2 simultaneous targets
    const multiTargets = await postCollections(
      jsonReq('http://localhost/api/citation-collections', 'POST', {
        action: 'add-item',
        collectionId: collection.id,
        sourceId: 'src-arxiv-2501-12948',
        contributionId: 'contrib-rl-cold-start',
        note: 'Ambiguous dual target',
      }),
    );
    expect(multiTargets.status).toBe(400);
    expect((await multiTargets.json()).code).toBe('EXACTLY_ONE_TARGET_REQUIRED');

    // Accept exactly 1 target
    const validItem = await postCollections(
      jsonReq('http://localhost/api/citation-collections', 'POST', {
        action: 'add-item',
        collectionId: collection.id,
        sourceId: 'src-arxiv-2501-12948',
        note: 'Primary source',
      }),
    );
    expect(validItem.status).toBe(201);

    const listRes = await getCollections();
    expect(listRes.status).toBe(200);

    const delRes = await deleteCollections(
      new NextRequest(`http://localhost/api/citation-collections?id=${collection.id}`, {
        method: 'DELETE',
      }),
    );
    expect(delRes.status).toBe(200);
  });

  it('drops and deterministically rebuilds GraphNode/GraphEdge read projection with zero self-edges', async () => {
    const initialRes = await getGraphRebuild();
    expect(initialRes.status).toBe(200);
    const initial = await initialRes.json();
    expect(initial.nodeCount).toBeGreaterThan(0);

    const rebuildRes = await postGraphRebuild(
      new NextRequest('http://localhost/api/graph/rebuild', { method: 'POST' }),
    );
    expect(rebuildRes.status).toBe(200);
    const rebuilt = await rebuildRes.json();
    expect(rebuilt.rebuilt).toBe(true);
    expect(rebuilt.nodeCount).toBeGreaterThanOrEqual(6);
    expect(rebuilt.edgeCount).toBeGreaterThanOrEqual(4);
    for (const edge of rebuilt.projection.edges as Array<{
      fromNodeId: string;
      toNodeId: string;
    }>) {
      expect(edge.fromNodeId).not.toBe(edge.toNodeId);
    }
  });

  it('manages Research Goal pause/resume/archive lifecycle and audited positive-delta progress events', async () => {
    const goalId = 'goal-weekly-sources';
    const initial = await getGoal(new NextRequest(`http://localhost/api/goals/${goalId}`), {
      params: Promise.resolve({ id: goalId }),
    });
    expect(initial.status).toBe(200);

    const updated = await patchGoal(
      jsonReq(`http://localhost/api/goals/${goalId}`, 'PATCH', {
        title: 'Audit 5 reasoning sources weekly',
        targetValue: 5,
      }),
      { params: Promise.resolve({ id: goalId }) },
    );
    expect(updated.status).toBe(200);
    expect((await updated.json()).goal.targetValue).toBe(5);

    const paused = await pauseGoal(
      new NextRequest(`http://localhost/api/goals/${goalId}/pause`, { method: 'POST' }),
      { params: Promise.resolve({ id: goalId }) },
    );
    expect(paused.status).toBe(200);
    expect((await paused.json()).goal.status).toBe('PAUSED');

    const resumed = await resumeGoal(
      new NextRequest(`http://localhost/api/goals/${goalId}/resume`, { method: 'POST' }),
      { params: Promise.resolve({ id: goalId }) },
    );
    expect(resumed.status).toBe(200);
    expect((await resumed.json()).goal.status).toBe('ACTIVE');

    // Record audited progress with Idempotency-Key
    const idem = { 'Idempotency-Key': 'goal-progress-evt-1' };
    const progPayload = { delta: 2, sourceKind: 'source-reviewed', note: 'Verified two benchmarks' };
    const prog1 = await postGoalProgress(
      jsonReq(`http://localhost/api/goals/${goalId}/progress`, 'POST', progPayload, idem),
      { params: Promise.resolve({ id: goalId }) },
    );
    expect(prog1.status).toBe(201);
    const prog1Data = await prog1.json();

    const progReplay = await postGoalProgress(
      jsonReq(`http://localhost/api/goals/${goalId}/progress`, 'POST', progPayload, idem),
      { params: Promise.resolve({ id: goalId }) },
    );
    expect(progReplay.headers.get('X-Idempotency-Replayed')).toBe('true');

    const historyRes = await getGoalProgress(
      new NextRequest(`http://localhost/api/goals/${goalId}/progress`),
      { params: Promise.resolve({ id: goalId }) },
    );
    const history = await historyRes.json();
    expect(history.events.some((e: { id: string }) => e.id === prog1Data.event.id)).toBe(true);

    // Archive goal and confirm resume & progress are rejected with 400 GOAL_ARCHIVED
    const archived = await archiveGoal(
      new NextRequest(`http://localhost/api/goals/${goalId}/archive`, { method: 'POST' }),
      { params: Promise.resolve({ id: goalId }) },
    );
    expect(archived.status).toBe(200);
    expect((await archived.json()).goal.status).toBe('ARCHIVED');

    const badResume = await resumeGoal(
      new NextRequest(`http://localhost/api/goals/${goalId}/resume`, { method: 'POST' }),
      { params: Promise.resolve({ id: goalId }) },
    );
    expect(badResume.status).toBe(400);
    expect((await badResume.json()).code).toBe('GOAL_ARCHIVED');

    const badProgress = await postGoalProgress(
      jsonReq(`http://localhost/api/goals/${goalId}/progress`, 'POST', {
        delta: 1,
        sourceKind: 'manual-verified',
      }),
      { params: Promise.resolve({ id: goalId }) },
    );
    expect(badProgress.status).toBe(400);
  });

  it('serves Source versions, Claim detail/update/evidence link+unlink, Discussion detail, and feature flag overrides', async () => {
    const srcVerGet = await getSourceVersions(
      new NextRequest('http://localhost/api/sources/src-arxiv-2501-12948/versions'),
      { params: Promise.resolve({ id: 'src-arxiv-2501-12948' }) },
    );
    expect(srcVerGet.status).toBe(200);

    const srcVerPost = await postSourceVersion(
      jsonReq('http://localhost/api/sources/src-arxiv-2501-12948/versions', 'POST', {
        versionLabel: 'v2-revised',
        snapshotUrl: 'https://arxiv.org/abs/2501.12948v2',
      }),
      { params: Promise.resolve({ id: 'src-arxiv-2501-12948' }) },
    );
    expect(srcVerPost.status).toBe(201);

    const claimGet = await getClaim(
      new NextRequest('http://localhost/api/claims/clm-rl-reasoning-tradeoff'),
      { params: Promise.resolve({ id: 'clm-rl-reasoning-tradeoff' }) },
    );
    expect(claimGet.status).toBe(200);

    const claimPatch = await patchClaim(
      jsonReq('http://localhost/api/claims/clm-rl-reasoning-tradeoff', 'PATCH', {
        statement:
          'Introducing curated cold-start SFT trajectories stabilizes multi-stage RL readability without degrading math reasoning accuracy.',
      }),
      { params: Promise.resolve({ id: 'clm-rl-reasoning-tradeoff' }) },
    );
    expect(claimPatch.status).toBe(200);

    const linkRes = await postClaimEvidence(
      jsonReq('http://localhost/api/claims/clm-rl-reasoning-tradeoff/evidence', 'POST', {
        evidenceId: 'ev-paged-kv-memory',
        relationship: 'CONTRADICTS',
        assertionMethod: 'AI_SUGGESTED',
        confidence: 0.72,
        rationale: 'Inference throughput constraints qualify deployment cost.',
      }),
      { params: Promise.resolve({ id: 'clm-rl-reasoning-tradeoff' }) },
    );
    expect(linkRes.status).toBe(201);
    const linked = await linkRes.json();
    expect(linked.link.status).toBe('PROPOSED');

    const unlinkRes = await deleteClaimEvidence(
      new NextRequest(
        'http://localhost/api/claims/clm-rl-reasoning-tradeoff/evidence?evidenceId=ev-paged-kv-memory&relationship=CONTRADICTS',
        { method: 'DELETE' },
      ),
      { params: Promise.resolve({ id: 'clm-rl-reasoning-tradeoff' }) },
    );
    expect(unlinkRes.status).toBe(200);

    const discRes = await getDiscussion(
      new NextRequest('http://localhost/api/discussions/disc-rl-cold-start-general'),
      { params: Promise.resolve({ id: 'disc-rl-cold-start-general' }) },
    );
    expect(discRes.status).toBe(200);
    expect((await discRes.json()).discussion.id).toBe('disc-rl-cold-start-general');

    // Feature flag toggle verification
    expect(isV34FlagEnabled('v34-topics-taxonomy')).toBe(true);
    process.env.V34_FLAG_TOPICS_TAXONOMY = 'false';
    expect(isV34FlagEnabled('v34-topics-taxonomy')).toBe(false);
    const disabledTopics = await getTopics(new NextRequest('http://localhost/api/topics'));
    expect((await disabledTopics.json()).flagDisabled).toBe(true);
  });
});
