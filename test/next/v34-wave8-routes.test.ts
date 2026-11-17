import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const actorState = {
  id: 'local-contributor',
  name: 'Local Researcher',
  isEditor: true,
};

vi.mock('@/lib/v34/http', async () => {
  const actual = await vi.importActual<typeof import('@/lib/v34/http')>('@/lib/v34/http');
  return {
    ...actual,
    requireContributor: vi.fn(async () => ({
      ok: true as const,
      actor: {
        id: actorState.id,
        name: actorState.name,
        email: 'researcher@example.edu',
        isEditor: actorState.isEditor,
        supabase: null,
      },
    })),
  };
});

import {
  autosaveDraft,
  createClaim,
  createEvidence,
  linkClaimEvidence,
  listClaims,
  listEvidence,
  listSourceVersions,
  resetV34StoreForTesting,
} from '@/lib/v34/store';
import {
  resetWave2StoreForTesting,
  listWorkspaces,
  listWorkspaceMembers,
  listProjects,
  listFormalReviews,
} from '@/lib/v34/wave2-store';
import { resetWave3StoreForTesting, listDiscussions, listNotifications, listToolRepositories, createAssistantTask } from '@/lib/v34/wave3-store';
import { resetAiGovernanceForTesting, recordAiProvenance } from '@/lib/v34/ai-governance';
import { resetExportsStoreForTesting, createScholarlyExport } from '@/lib/v34/exports';
import { resetWave7StoreForTesting, registerUserDevice, registerPushSubscription } from '@/lib/v34/wave7-store';
import { resetWave8StoreForTesting } from '@/lib/v34/wave8-store';
import { resetOutboxForTesting, listOutboxEvents, listAuditEvents, listBackgroundJobs } from '@/lib/v34/outbox';
import { createRequestContext, logStructuredError, sanitizeTelemetryMetadata } from '@/lib/v34/observability';

// Wave 8 route handlers
import { GET as getEvidenceRoute, DELETE as deleteEvidenceRoute } from '@/app/api/evidence/[id]/route';
import { POST as createEvAssessment, GET as listEvAssessments } from '@/app/api/evidence/[id]/assessments/route';
import { DELETE as deleteClaimRoute } from '@/app/api/claims/[id]/route';
import { POST as createClmAssessment, GET as listClmAssessments } from '@/app/api/claims/[id]/assessments/route';
import { DELETE as unlinkClaimEv } from '@/app/api/claims/[id]/evidence/[evidenceId]/route';
import { PATCH as patchSource } from '@/app/api/sources/[id]/route';
import { POST as createSnapshot } from '@/app/api/drafts/[id]/snapshots/route';
import { POST as restoreSnapshotParam } from '@/app/api/drafts/[id]/restore/[snapshotId]/route';
import { PATCH as patchReviewItem } from '@/app/api/reviews/[id]/items/[itemId]/route';
import { PATCH as patchDiscussionMeta } from '@/app/api/discussions/route';
import { POST as refreshTool } from '@/app/api/tools/[id]/refresh/route';
import { POST as linkToolSourceAlias } from '@/app/api/tools/[id]/sources/route';
import { POST as approveAi } from '@/app/api/ai/approve/route';
import { POST as rejectAi } from '@/app/api/ai/reject/route';
import { POST as createSession } from '@/app/api/assistant/sessions/route';
import { POST as postSessionMsg } from '@/app/api/assistant/sessions/[id]/messages/route';
import { GET as listCanonicalTasks } from '@/app/api/assistant/tasks/route';
import { PATCH as patchCanonicalTask } from '@/app/api/assistant/tasks/[id]/route';
import { PATCH as patchWsMember, DELETE as deleteWsMember } from '@/app/api/workspaces/[id]/members/[userId]/route';
import { GET as listWsAccessReqs, POST as createWsAccessReq } from '@/app/api/workspaces/[id]/access-requests/route';
import { PATCH as decideWsAccessReq } from '@/app/api/workspaces/[id]/access-requests/[requestId]/route';
import { DELETE as deleteProjectRoute } from '@/app/api/projects/[id]/route';
import { GET as listTasksRoute, POST as createTaskRoute } from '@/app/api/projects/[id]/tasks/route';
import { PATCH as patchTaskRoute } from '@/app/api/projects/[id]/tasks/[taskId]/route';
import { PATCH as patchMilestoneRoute } from '@/app/api/projects/[id]/milestones/[milestoneId]/route';
import { PATCH as patchProjMember } from '@/app/api/projects/[id]/members/[userId]/route';
import { DELETE as unlinkProjObject } from '@/app/api/projects/[id]/objects/[objectId]/route';
import { POST as createLibItemDirect } from '@/app/api/library/items/route';
import { PATCH as patchLibItemDirect, DELETE as deleteLibItemDirect } from '@/app/api/library/items/[id]/route';
import { GET as listLibCols, POST as createLibCol } from '@/app/api/library/collections/route';
import { PATCH as patchLibCol, DELETE as deleteLibCol } from '@/app/api/library/collections/[id]/route';
import { GET as getMe, DELETE as deleteMe } from '@/app/api/me/route';
import { POST as addAff } from '@/app/api/me/affiliations/route';
import { PATCH as patchAff, DELETE as deleteAff } from '@/app/api/me/affiliations/[id]/route';
import { POST as addExp } from '@/app/api/me/expertise/route';
import { DELETE as deleteExp } from '@/app/api/me/expertise/[id]/route';
import { POST as connectOrcid } from '@/app/api/me/orcid/connect/route';
import { POST as connectGithub } from '@/app/api/me/github/connect/route';
import { GET as getDashContinue } from '@/app/api/dashboard/continue-working/route';
import { GET as getDashAttention } from '@/app/api/dashboard/attention/route';
import { GET as getDashActivity } from '@/app/api/dashboard/activity/route';
import { GET as getDashImpact } from '@/app/api/dashboard/impact/route';
import { GET as getDashProjects } from '@/app/api/dashboard/projects/route';
import { GET as getDashContribs } from '@/app/api/dashboard/contributions/route';
import { POST as reorderDashModules } from '@/app/api/dashboard/modules/reorder/route';
import { PATCH as patchDevice } from '@/app/api/devices/[id]/route';
import { PATCH as markNotifRead } from '@/app/api/notifications/[id]/read/route';
import { DELETE as deletePushSubById } from '@/app/api/push/subscriptions/[id]/route';
import { POST as ackSync } from '@/app/api/sync/acknowledge/route';
import { GET as downloadExport } from '@/app/api/exports/[id]/download/route';
import { POST as createRemotionRender } from '@/app/api/renders/remotion/route';
import { POST as createHyperframesRender } from '@/app/api/renders/hyperframes/route';
import { GET as getRenderRoute, DELETE as cancelRenderRoute } from '@/app/api/renders/[id]/route';

function jsonReq(url: string, method: string, body?: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe('v3.4 Wave 8 — 100% Part V §6 API Catalogue Parity, Outbox, Telemetry & Governed Renders', () => {
  beforeEach(() => {
    resetV34StoreForTesting();
    resetWave2StoreForTesting();
    resetWave3StoreForTesting();
    resetAiGovernanceForTesting();
    resetExportsStoreForTesting();
    resetWave7StoreForTesting();
    resetWave8StoreForTesting();
    resetOutboxForTesting();
    actorState.id = 'local-contributor';
    actorState.isEditor = true;
  });

  it('enforces ADR-032 canonical deletion guards, structured assessments, claim-evidence unlink, source patch, and draft snapshots', async () => {
    const publishedEvId = listEvidence()[0].id;
    const publishedClaimId = listClaims()[0].id;

    // 1. Assessments & GET evidence
    const evAssessRes = await createEvAssessment(
      jsonReq(`http://localhost/api/evidence/${publishedEvId}/assessments`, 'POST', {
        rigorScore: 5,
        verifiabilityScore: 4,
        notes: 'Checked original table metrics.',
      }),
      { params: Promise.resolve({ id: publishedEvId }) },
    );
    expect(evAssessRes.status).toBe(201);
    const evGet = await getEvidenceRoute(new NextRequest(`http://localhost/api/evidence/${publishedEvId}`), {
      params: Promise.resolve({ id: publishedEvId }),
    });
    expect(evGet.status).toBe(200);
    const evPayload = await evGet.json();
    expect(evPayload.assessments.length).toBeGreaterThanOrEqual(1);

    const clmAssessRes = await createClmAssessment(
      jsonReq(`http://localhost/api/claims/${publishedClaimId}/assessments`, 'POST', {
        evidenceSupportScore: 4,
        confidenceLevel: 'HIGH',
        rationale: 'Replicated across multiple math reasoning benchmarks.',
      }),
      { params: Promise.resolve({ id: publishedClaimId }) },
    );
    expect(clmAssessRes.status).toBe(201);
    const listClmRes = await listClmAssessments(
      new NextRequest(`http://localhost/api/claims/${publishedClaimId}/assessments`),
      { params: Promise.resolve({ id: publishedClaimId }) },
    );
    expect((await listClmRes.json()).total).toBeGreaterThanOrEqual(1);
    const listEvRes = await listEvAssessments(
      new NextRequest(`http://localhost/api/evidence/${publishedEvId}/assessments`),
      { params: Promise.resolve({ id: publishedEvId }) },
    );
    expect((await listEvRes.json()).total).toBeGreaterThanOrEqual(1);

    // 2. ADR-032: cannot delete Evidence or Claim referenced by published contribution -> 409
    const blockedEvDel = await deleteEvidenceRoute(
      new NextRequest(`http://localhost/api/evidence/${publishedEvId}`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: publishedEvId }) },
    );
    expect(blockedEvDel.status).toBe(409);

    const blockedClmDel = await deleteClaimRoute(
      new NextRequest(`http://localhost/api/claims/${publishedClaimId}`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: publishedClaimId }) },
    );
    expect(blockedClmDel.status).toBe(409);

    // 3. Unreferenced evidence & claim can be linked, unlinked via path DELETE, then deleted cleanly
    const svId = listSourceVersions('src-arxiv-2501-12948')?.[0]?.id ?? 'sv-arxiv-2501-12948-v1';
    const freshEvRes = createEvidence({
      sourceId: 'src-arxiv-2501-12948',
      sourceVersionId: svId,
      statement: 'Auxiliary ablation check for deletion test.',
      locator: { kind: 'section', value: 'Appendix B' },
      extractionType: 'quantitative',
      createdBy: 'local-contributor',
    });
    expect(freshEvRes.ok).toBe(true);
    if (!freshEvRes.ok) throw new Error('Expected evidence creation to succeed');
    const freshEvId = freshEvRes.evidence.id;

    const freshClm = createClaim({
      statement: 'Auxiliary claim for unlink and delete test.',
      claimType: 'empirical',
      createdBy: 'local-contributor',
    });
    linkClaimEvidence({
      claimId: freshClm.id,
      evidenceId: freshEvId,
      relationship: 'SUPPORTS',
      assertionMethod: 'MANUAL',
      assertedBy: 'local-contributor',
    });

    const unlinkRes = await unlinkClaimEv(
      new NextRequest(`http://localhost/api/claims/${freshClm.id}/evidence/${freshEvId}`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: freshClm.id, evidenceId: freshEvId }) },
    );
    expect(unlinkRes.status).toBe(200);
    expect((await unlinkRes.json()).canonicalPreserved).toBe(true);

    expect(
      (
        await deleteEvidenceRoute(
          new NextRequest(`http://localhost/api/evidence/${freshEvId}`, { method: 'DELETE' }),
          { params: Promise.resolve({ id: freshEvId }) },
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await deleteClaimRoute(
          new NextRequest(`http://localhost/api/claims/${freshClm.id}`, { method: 'DELETE' }),
          { params: Promise.resolve({ id: freshClm.id }) },
        )
      ).status,
    ).toBe(200);

    // 4. Source PATCH & Draft manual snapshot + param-based restore
    const srcPatch = await patchSource(
      jsonReq('http://localhost/api/sources/src-arxiv-2501-12948', 'PATCH', {
        venue: 'arXiv Preprint (Updated)',
        year: 2025,
      }),
      { params: Promise.resolve({ id: 'src-arxiv-2501-12948' }) },
    );
    expect(srcPatch.status).toBe(200);
    expect((await srcPatch.json()).source.venue).toBe('arXiv Preprint (Updated)');

    const draftId = 'draft-wave8-snap';
    autosaveDraft({
      draftId,
      authorId: 'local-contributor',
      title: 'Snapshot Restore Test Draft',
      contributionType: 'research-note',
      baseVersion: 0,
      mutationId: 'mut-wave8-init-01',
      document: {
        schemaVersion: '1.0',
        id: draftId,
        title: 'Snapshot Restore Test Draft',
        authorId: 'local-contributor',
        workspaceId: 'ws-default',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        blocks: [{ id: 'b1', type: 'paragraph', text: 'Initial snapshot body.' }],
      },
      reason: 'interval',
    });
    const snapRes = await createSnapshot(
      jsonReq(`http://localhost/api/drafts/${draftId}/snapshots`, 'POST', {
        label: 'Pre-review checkpoint',
      }),
      { params: Promise.resolve({ id: draftId }) },
    );
    expect(snapRes.status).toBe(201);
    const snapId = (await snapRes.json()).snapshot.id;

    const restoreRes = await restoreSnapshotParam(
      new NextRequest(`http://localhost/api/drafts/${draftId}/restore/${snapId}`, { method: 'POST' }),
      { params: Promise.resolve({ id: draftId, snapshotId: snapId }) },
    );
    expect(restoreRes.status).toBe(200);
    expect((await restoreRes.json()).restoredFromSnapshotId).toBe(snapId);
  });

  it('handles AI approve/reject, classification-gated assistant sessions, tool refresh/sources, review items & discussions', async () => {
    // 1. AI Approve & Reject
    const prov = await recordAiProvenance({
      actorId: 'local-contributor',
      workspaceId: null,
      targetType: 'claim',
      targetId: 'claim-rl-cold-start-01',
      provider: 'internal-local',
      model: 'reme-verifier-v34',
      modelVersion: '3.4.0',
      operation: 'check-entailment',
      transformationType: 'check-entailment',
      dataClassification: 'PUBLIC',
      promptTemplateVersion: 'v1',
      retrievalTime: new Date().toISOString(),
      sourceIds: ['src-arxiv-2501-12948'],
      toolCalls: [],
      generationTimeMs: 3,
      citationValidationStatus: 'PASSED',
      humanReviewStatus: 'PENDING',
    });
    const appRes = await approveAi(
      jsonReq('http://localhost/api/ai/approve', 'POST', { provenanceId: prov.id, notes: 'Verified manually.' }),
    );
    expect(appRes.status).toBe(200);
    expect((await appRes.json()).provenance.humanReviewStatus).toBe('APPROVED');

    const rejRes = await rejectAi(
      jsonReq('http://localhost/api/ai/reject', 'POST', { provenanceId: prov.id, notes: 'Superseded.' }),
    );
    expect(rejRes.status).toBe(200);
    expect((await rejRes.json()).provenance.humanReviewStatus).toBe('REJECTED');

    // 2. Assistant session enforcing CONFIDENTIAL prohibited external provider
    const sessRes = await createSession(
      jsonReq('http://localhost/api/assistant/sessions', 'POST', {
        title: 'Embargoed Manuscript Check',
        dataClassification: 'CONFIDENTIAL',
        contextSourceIds: ['src-arxiv-2501-12948'],
      }),
    );
    expect(sessRes.status).toBe(201);
    const sessionId = (await sessRes.json()).session.id;

    const blockedMsg = await postSessionMsg(
      jsonReq(`http://localhost/api/assistant/sessions/${sessionId}/messages`, 'POST', {
        content: 'Summarize confidential findings',
        provider: 'external-openai',
        model: 'gpt-4o',
      }),
      { params: Promise.resolve({ id: sessionId }) },
    );
    expect(blockedMsg.status).toBe(422);
    expect((await blockedMsg.json()).code).toBe('PROHIBITED_EXTERNAL_PROCESSING');

    const allowedMsg = await postSessionMsg(
      jsonReq(`http://localhost/api/assistant/sessions/${sessionId}/messages`, 'POST', {
        content: 'Check source alignment locally',
        provider: 'internal-isolated',
        model: 'reme-grounded-v34',
      }),
      { params: Promise.resolve({ id: sessionId }) },
    );
    expect(allowedMsg.status).toBe(201);
    expect((await allowedMsg.json()).provenanceId).toBeTruthy();

    // 3. Canonical /api/assistant/tasks list + patch
    const createdTask = await createAssistantTask({
      userId: 'local-contributor',
      taskType: 'compare-sources',
      title: 'Check benchmark table variance',
      explanation: 'Optional verification task across seed sweeps',
      sourceIds: ['src-arxiv-2501-12948'],
    });
    const listTasks = await listCanonicalTasks(new NextRequest('http://localhost/api/assistant/tasks'));
    expect(listTasks.status).toBe(200);
    expect((await listTasks.json()).total).toBeGreaterThanOrEqual(1);

    const patchTask = await patchCanonicalTask(
      jsonReq(`http://localhost/api/assistant/tasks/${createdTask.id}`, 'PATCH', { status: 'COMPLETED' }),
      { params: Promise.resolve({ id: createdTask.id }) },
    );
    expect(patchTask.status).toBe(200);
    expect((await patchTask.json()).task.status).toBe('COMPLETED');

    // 4. Tool refresh + /sources alias + Review item patch + Discussion metadata patch
    const tool = (await listToolRepositories())[0];
    const refRes = await refreshTool(
      new NextRequest(`http://localhost/api/tools/${tool.id}/refresh`, { method: 'POST' }),
      { params: Promise.resolve({ id: tool.id }) },
    );
    expect(refRes.status).toBe(200);
    expect(listBackgroundJobs().some((j) => j.jobType === 'source.refresh')).toBe(true);

    const srcLinkRes = await linkToolSourceAlias(
      jsonReq(`http://localhost/api/tools/${tool.id}/sources`, 'POST', {
        sourceId: 'src-arxiv-2501-12948',
        releaseTag: 'v0.7.0',
      }),
      { params: Promise.resolve({ id: tool.id }) },
    );
    expect(srcLinkRes.status).toBe(201);

    const review = listFormalReviews()[0];
    const item = review.items[0];
    const riPatch = await patchReviewItem(
      jsonReq(`http://localhost/api/reviews/${review.id}/items/${item.id}`, 'PATCH', { resolved: true }),
      { params: Promise.resolve({ id: review.id, itemId: item.id }) },
    );
    expect(riPatch.status).toBe(200);
    expect((await riPatch.json()).item.status).toBe('resolved');

    const disc = listDiscussions()[0];
    const discPatch = await patchDiscussionMeta(
      jsonReq('http://localhost/api/discussions', 'PATCH', {
        discussionId: disc.id,
        title: `${disc.title} (Updated)`,
      }),
    );
    expect(discPatch.status).toBe(200);
    expect((await discPatch.json()).discussion.title).toContain('(Updated)');
  });

  it('covers workspaces, projects, library collections/items, identity /api/me/*, dashboard modules, sync, exports download, governed renders & telemetry redaction', async () => {
    // 1. Workspace access requests & member management
    const ws = (await listWorkspaces())[0];
    const reqCreate = await createWsAccessReq(
      jsonReq(`http://localhost/api/workspaces/${ws.id}/access-requests`, 'POST', {
        requestedRole: 'RESEARCHER',
        rationale: 'Joining reasoning replication team.',
      }),
      { params: Promise.resolve({ id: ws.id }) },
    );
    expect(reqCreate.status).toBe(201);
    const reqId = (await reqCreate.json()).accessRequest.id;

    const reqList = await listWsAccessReqs(new NextRequest(`http://localhost/api/workspaces/${ws.id}/access-requests`), {
      params: Promise.resolve({ id: ws.id }),
    });
    expect((await reqList.json()).total).toBe(1);

    const reqDecide = await decideWsAccessReq(
      jsonReq(`http://localhost/api/workspaces/${ws.id}/access-requests/${reqId}`, 'PATCH', {
        status: 'APPROVED',
        decisionNote: 'Welcome aboard.',
      }),
      { params: Promise.resolve({ id: ws.id, requestId: reqId }) },
    );
    expect(reqDecide.status).toBe(200);
    expect((await reqDecide.json()).accessRequest.status).toBe('APPROVED');

    // Member role update & sole-owner protection
    const wsMembers = listWorkspaceMembers(ws.id);
    const ownerMember = wsMembers.find((m) => m.role === 'OWNER');
    if (ownerMember) {
      const soleOwnerDel = await deleteWsMember(
        new NextRequest(`http://localhost/api/workspaces/${ws.id}/members/${ownerMember.userId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ id: ws.id, userId: ownerMember.userId }) },
      );
      expect(soleOwnerDel.status).toBe(409);
    }
    const otherMember = wsMembers.find((m) => m.role !== 'OWNER');
    if (otherMember) {
      const roleRes = await patchWsMember(
        jsonReq(`http://localhost/api/workspaces/${ws.id}/members/${otherMember.userId}`, 'PATCH', {
          role: 'REVIEWER',
        }),
        { params: Promise.resolve({ id: ws.id, userId: otherMember.userId }) },
      );
      expect(roleRes.status).toBe(200);
    }

    // 2. Project tasks, milestones, member role, object unlink, and delete
    const proj = (await listProjects())[0];
    const tCreate = await createTaskRoute(
      jsonReq(`http://localhost/api/projects/${proj.id}/tasks`, 'POST', {
        title: 'Run determinism ablation check',
        priority: 'HIGH',
      }),
      { params: Promise.resolve({ id: proj.id }) },
    );
    expect(tCreate.status).toBe(201);
    const taskId = (await tCreate.json()).task.id;

    const tList = await listTasksRoute(new NextRequest(`http://localhost/api/projects/${proj.id}/tasks`), {
      params: Promise.resolve({ id: proj.id }),
    });
    expect((await tList.json()).total).toBeGreaterThanOrEqual(1);

    const tPatch = await patchTaskRoute(
      jsonReq(`http://localhost/api/projects/${proj.id}/tasks/${taskId}`, 'PATCH', { status: 'DONE' }),
      { params: Promise.resolve({ id: proj.id, taskId }) },
    );
    expect(tPatch.status).toBe(200);
    expect((await tPatch.json()).task.status).toBe('DONE');

    if (proj.milestones[0]) {
      const mPatch = await patchMilestoneRoute(
        jsonReq(`http://localhost/api/projects/${proj.id}/milestones/${proj.milestones[0].id}`, 'PATCH', {
          status: 'COMPLETED',
        }),
        { params: Promise.resolve({ id: proj.id, milestoneId: proj.milestones[0].id }) },
      );
      expect(mPatch.status).toBe(200);
    }
    if (proj.members[0]) {
      const pmPatch = await patchProjMember(
        jsonReq(`http://localhost/api/projects/${proj.id}/members/${proj.members[0].userId}`, 'PATCH', {
          role: 'LEAD',
        }),
        { params: Promise.resolve({ id: proj.id, userId: proj.members[0].userId }) },
      );
      expect(pmPatch.status).toBe(200);
    }
    if (proj.objects[0]) {
      const compositeObj = encodeURIComponent(`${proj.objects[0].objectType}:${proj.objects[0].objectId}`);
      const poUnlink = await unlinkProjObject(
        new NextRequest(`http://localhost/api/projects/${proj.id}/objects/${compositeObj}`, { method: 'DELETE' }),
        { params: Promise.resolve({ id: proj.id, objectId: compositeObj }) },
      );
      expect(poUnlink.status).toBe(200);
    }

    // 3. Library Collections & Direct Items
    const colCreate = await createLibCol(
      jsonReq('http://localhost/api/library/collections', 'POST', { name: 'Cold-Start Papers' }),
    );
    expect(colCreate.status).toBe(201);
    const colId = (await colCreate.json()).collection.id;
    expect((await (await listLibCols(new NextRequest('http://localhost/api/library/collections'))).json()).total).toBeGreaterThanOrEqual(1);
    expect(
      (
        await patchLibCol(
          jsonReq(`http://localhost/api/library/collections/${colId}`, 'PATCH', { name: 'Cold-Start Archive' }),
          { params: Promise.resolve({ id: colId }) },
        )
      ).status,
    ).toBe(200);

    const itemCreate = await createLibItemDirect(
      jsonReq('http://localhost/api/library/items', 'POST', {
        targetType: 'SOURCE',
        targetId: 'src-arxiv-2501-12948',
        state: 'TO_READ',
        collectionId: colId,
      }),
    );
    expect(itemCreate.status).toBe(201);
    const itemId = (await itemCreate.json()).item.id;
    expect(
      (
        await patchLibItemDirect(
          jsonReq(`http://localhost/api/library/items/${itemId}`, 'PATCH', { state: 'IN_PROGRESS' }),
          { params: Promise.resolve({ id: itemId }) },
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await deleteLibItemDirect(new NextRequest(`http://localhost/api/library/items/${itemId}`, { method: 'DELETE' }), {
          params: Promise.resolve({ id: itemId }),
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await deleteLibCol(new NextRequest(`http://localhost/api/library/collections/${colId}`, { method: 'DELETE' }), {
          params: Promise.resolve({ id: colId }),
        })
      ).status,
    ).toBe(200);

    // 4. Identity /api/me/* & Granular Dashboard Modules
    expect((await getMe(new NextRequest('http://localhost/api/me'))).status).toBe(200);
    const affRes = await addAff(
      jsonReq('http://localhost/api/me/affiliations', 'POST', {
        institution: 'Independent Research Lab',
        role: 'Principal Investigator',
        primary: true,
      }),
    );
    expect(affRes.status).toBe(201);
    const affId = (await affRes.json()).affiliation.id;
    expect(
      (
        await patchAff(
          jsonReq(`http://localhost/api/me/affiliations/${affId}`, 'PATCH', { role: 'Senior PI' }),
          { params: Promise.resolve({ id: affId }) },
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await deleteAff(new NextRequest(`http://localhost/api/me/affiliations/${affId}`, { method: 'DELETE' }), {
          params: Promise.resolve({ id: affId }),
        })
      ).status,
    ).toBe(200);

    const expRes = await addExp(
      jsonReq('http://localhost/api/me/expertise', 'POST', {
        topicSlug: 'reasoning-models',
        label: 'RL Verifiers',
        level: 'DOMAIN_EXPERT',
      }),
    );
    expect(expRes.status).toBe(201);
    const expId = (await expRes.json()).expertise.id;
    expect(
      (
        await deleteExp(new NextRequest(`http://localhost/api/me/expertise/${expId}`, { method: 'DELETE' }), {
          params: Promise.resolve({ id: expId }),
        })
      ).status,
    ).toBe(200);

    expect(
      (
        await connectOrcid(
          jsonReq('http://localhost/api/me/orcid/connect', 'POST', { orcid: '0000-0002-1825-0097' }),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await connectGithub(
          jsonReq('http://localhost/api/me/github/connect', 'POST', { githubHandle: 'myself-aas' }),
        )
      ).status,
    ).toBe(200);

    // Dashboard endpoints
    expect((await getDashContinue(new NextRequest('http://localhost/api/dashboard/continue-working'))).status).toBe(200);
    expect((await getDashAttention(new NextRequest('http://localhost/api/dashboard/attention'))).status).toBe(200);
    expect((await getDashActivity(new NextRequest('http://localhost/api/dashboard/activity'))).status).toBe(200);
    expect((await getDashImpact(new NextRequest('http://localhost/api/dashboard/impact?range=30d'))).status).toBe(200);
    expect((await getDashProjects(new NextRequest('http://localhost/api/dashboard/projects'))).status).toBe(200);
    expect((await getDashContribs(new NextRequest('http://localhost/api/dashboard/contributions'))).status).toBe(200);
    expect(
      (
        await reorderDashModules(
          jsonReq('http://localhost/api/dashboard/modules/reorder', 'POST', {
            moduleOrder: ['attention_queue', 'continue_working', 'research_goals'],
          }),
        )
      ).status,
    ).toBe(200);

    // 5. Devices PATCH, Notification single read PATCH, Push DELETE by ID, Sync Acknowledge
    const dev = await registerUserDevice({ userId: 'local-contributor', label: 'Tablet', platform: 'pwa' });
    expect(
      (
        await patchDevice(
          jsonReq(`http://localhost/api/devices/${dev.id}`, 'PATCH', { deviceName: 'Research Tablet Pro' }),
          { params: Promise.resolve({ id: dev.id }) },
        )
      ).status,
    ).toBe(200);

    const notif = listNotifications('local-contributor')[0];
    if (notif) {
      const nRes = await markNotifRead(
        new NextRequest(`http://localhost/api/notifications/${notif.id}/read`, { method: 'PATCH' }),
        { params: Promise.resolve({ id: notif.id }) },
      );
      expect(nRes.status).toBe(200);
      expect((await nRes.json()).notification.readAt).toBeTruthy();
    }

    const push = await registerPushSubscription({
      userId: 'local-contributor',
      deviceId: dev.id,
      endpoint: 'https://push.example.com/sub-wave8',
      p256dh: 'p256dh-test-key-0123456789abcdef',
      authSecret: 'auth-secret-test-012345',
      classificationSafePreview: true,
    });
    expect(
      (
        await deletePushSubById(
          new NextRequest(`http://localhost/api/push/subscriptions/${push.id}`, { method: 'DELETE' }),
          { params: Promise.resolve({ id: push.id }) },
        )
      ).status,
    ).toBe(200);

    const ackRes = await ackSync(
      jsonReq('http://localhost/api/sync/acknowledge', 'POST', {
        deviceId: dev.id,
        resourceType: 'notifications',
        cursor: new Date().toISOString(),
      }),
    );
    expect(ackRes.status).toBe(200);
    expect((await ackRes.json()).acknowledged).toBe(true);

    // 6. Export Download & Governed Media Renders (Remotion + Hyperframes)
    const exp = await createScholarlyExport({
      userId: 'local-contributor',
      targetType: 'contribution',
      targetId: 'contrib-rl-cold-start',
      format: 'bibtex',
    });
    expect(exp.ok).toBe(true);
    if (exp.ok) {
      const dlRes = await downloadExport(
        new NextRequest(`http://localhost/api/exports/${exp.exportRecord.id}/download`),
        { params: Promise.resolve({ id: exp.exportRecord.id }) },
      );
      expect(dlRes.status).toBe(200);
      expect(dlRes.headers.get('X-Content-SHA256')).toBe(exp.exportRecord.checksumSha256);
      expect(dlRes.headers.get('Content-Disposition')).toContain('attachment');
    }

    const remRes = await createRemotionRender(
      jsonReq('http://localhost/api/renders/remotion', 'POST', {
        compositionId: 'EvidenceSummaryReel',
        sourceContributionId: 'contrib-rl-cold-start',
        durationSeconds: 45,
        humanApproved: false,
      }),
    );
    expect(remRes.status).toBe(202);
    const remRender = (await remRes.json()).render;
    expect(remRender.status).toBe('PENDING_APPROVAL');
    expect(remRender.inputChecksumSha256).toHaveLength(64);

    const hfRes = await createHyperframesRender(
      jsonReq('http://localhost/api/renders/hyperframes', 'POST', {
        compositionId: 'ClaimCardLoop',
        durationSeconds: 15,
        humanApproved: true,
      }),
    );
    expect(hfRes.status).toBe(202);
    expect((await hfRes.json()).render.status).toBe('QUEUED');

    const getRem = await getRenderRoute(new NextRequest(`http://localhost/api/renders/${remRender.id}`), {
      params: Promise.resolve({ id: remRender.id }),
    });
    expect(getRem.status).toBe(200);
    const cancelRem = await cancelRenderRoute(
      new NextRequest(`http://localhost/api/renders/${remRender.id}`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: remRender.id }) },
    );
    expect(cancelRem.status).toBe(200);
    expect((await cancelRem.json()).render.status).toBe('CANCELLED');

    // 7. Account tombstone deletion & Project delete
    const delMeRes = await deleteMe(
      jsonReq('http://localhost/api/me', 'DELETE', {
        confirmationPhrase: 'DELETE MY ACCOUNT',
        retainCitationTombstones: true,
      }),
    );
    expect(delMeRes.status).toBe(200);
    expect((await delMeRes.json()).tombstone.retainCitationTombstones).toBe(true);

    expect(
      (
        await deleteProjectRoute(new NextRequest(`http://localhost/api/projects/${proj.id}`, { method: 'DELETE' }), {
          params: Promise.resolve({ id: proj.id }),
        })
      ).status,
    ).toBe(200);

    // 8. Outbox, Audit Events & Observability Redaction (Part V §9 & §13)
    expect(listOutboxEvents().length).toBeGreaterThanOrEqual(2);
    expect(listAuditEvents('local-contributor').length).toBeGreaterThanOrEqual(3);

    const ctx = createRequestContext(new NextRequest('http://localhost/api/drafts/d1'), {
      route: '/api/drafts/[id]/autosave',
      userId: 'local-contributor',
    });
    const safeErr = logStructuredError('draft_autosave_failed', ctx, new Error('Version mismatch'), {
      body: 'CONFIDENTIAL UNPUBLISHED MANUSCRIPT TEXT',
      reviewerName: 'Dr. Secret Reviewer',
      baseVersion: 4,
    });
    expect(safeErr.body).toBe('[REDACTED]');
    expect(safeErr.reviewerName).toBe('[REDACTED]');
    expect(safeErr.baseVersion).toBe(4);
    expect(sanitizeTelemetryMetadata({ quote: 'Sensitive quote' }).quote).toBe('[REDACTED]');
  });
});
