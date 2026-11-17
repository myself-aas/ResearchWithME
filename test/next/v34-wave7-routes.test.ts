import crypto from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  DELETE as deleteContributionEvidence,
  POST as postContributionEvidence,
} from '@/app/api/contributions/[id]/evidence/route';
import {
  DELETE as deleteContributionClaim,
  POST as postContributionClaim,
} from '@/app/api/contributions/[id]/claims/route';
import {
  DELETE as deleteRelationship,
  PATCH as patchRelationship,
} from '@/app/api/relationships/[id]/route';
import {
  DELETE as deleteDiscussionComment,
  PATCH as patchDiscussionComment,
} from '@/app/api/discussions/[id]/comments/[commentId]/route';
import {
  GET as getReviewById,
  PATCH as patchReviewById,
} from '@/app/api/reviews/[id]/route';
import { POST as postSubmitReviewVerdict } from '@/app/api/reviews/[id]/submit/route';
import {
  GET as getWorkspaceByIdRoute,
  PATCH as patchWorkspaceByIdRoute,
} from '@/app/api/workspaces/[id]/route';
import { POST as postImportTool } from '@/app/api/tools/import/route';
import {
  GET as getToolByIdRoute,
  PATCH as patchToolByIdRoute,
} from '@/app/api/tools/[id]/route';
import { POST as postCheckEntailment } from '@/app/api/ai/check-entailment/route';
import { GET as getNotifications } from '@/app/api/notifications/route';
import { POST as postNotificationsReadAll } from '@/app/api/notifications/read-all/route';
import { GET as getSearchSuggestionsRoute } from '@/app/api/search/suggestions/route';
import { GET as getDevices, POST as postDevices } from '@/app/api/devices/route';
import { DELETE as deleteDevice } from '@/app/api/devices/[id]/route';
import {
  DELETE as deletePushSub,
  GET as getPushSubs,
  POST as postPushSub,
} from '@/app/api/push/subscriptions/route';
import { GET as getSyncDeltaRoute } from '@/app/api/sync/[resourceType]/route';
import { GET as getMyProfile, PATCH as patchMyProfile } from '@/app/api/me/profile/route';
import { GET as getMyExport } from '@/app/api/me/export/route';
import { GET as getPublicProfile } from '@/app/api/profiles/[username]/route';
import { PATCH as patchDashboardModule } from '@/app/api/dashboard/modules/[moduleKey]/route';
import { resetAiGovernanceForTesting } from '@/lib/v34/ai-governance';
import { resetIdempotencyStoreForTesting } from '@/lib/v34/idempotency';
import {
  getClaimById,
  getEvidenceById,
  linkClaimEvidence,
  listClaims,
  listEvidence,
  resetV34StoreForTesting,
} from '@/lib/v34/store';
import { listFormalReviews, resetWave2StoreForTesting } from '@/lib/v34/wave2-store';
import {
  listAttentionItems,
  listDiscussions,
  resetWave3StoreForTesting,
} from '@/lib/v34/wave3-store';
import { resetWave5StoreForTesting } from '@/lib/v34/wave5-store';
import { resetWave7StoreForTesting } from '@/lib/v34/wave7-store';

let activeActorId = 'local-contributor';
let activeActorEditor = true;

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
        name: 'Test Researcher',
        handle: 'myself-aas',
        isEditor: activeActorEditor,
        supabase: null,
      },
    })),
  };
});

function jsonReq(url: string, method: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe('ResearchWithME v3.4 Wave 7 — Canonical Sub-Routes, Tools Import, AI Entailment, Notifications Read-All, Devices/Push/Sync & Profile', () => {
  beforeEach(() => {
    activeActorId = 'local-contributor';
    activeActorEditor = true;
    resetIdempotencyStoreForTesting();
    resetV34StoreForTesting();
    resetWave2StoreForTesting();
    resetWave3StoreForTesting();
    resetWave5StoreForTesting();
    resetWave7StoreForTesting();
    resetAiGovernanceForTesting();
  });

  it('links/unlinks canonical evidence & claims on contributions without deleting canonical objects, and curates/deletes relationships', async () => {
    const evId = listEvidence()[0].id;
    const clmId = listClaims()[0].id;

    const linkEv = await postContributionEvidence(
      jsonReq('http://localhost/api/contributions/contrib-rl-cold-start/evidence', 'POST', {
        evidenceId: evId,
      }),
      { params: Promise.resolve({ id: 'contrib-rl-cold-start' }) },
    );
    expect(linkEv.status).toBe(201);

    const unlinkEv = await deleteContributionEvidence(
      new NextRequest(
        `http://localhost/api/contributions/contrib-rl-cold-start/evidence?evidenceId=${evId}`,
        { method: 'DELETE' },
      ),
      { params: Promise.resolve({ id: 'contrib-rl-cold-start' }) },
    );
    expect(unlinkEv.status).toBe(200);
    expect((await unlinkEv.json()).canonicalEvidencePreserved).toBe(true);
    expect(getEvidenceById(evId)).not.toBeNull();

    const linkClm = await postContributionClaim(
      jsonReq('http://localhost/api/contributions/contrib-rl-cold-start/claims', 'POST', {
        claimId: clmId,
      }),
      { params: Promise.resolve({ id: 'contrib-rl-cold-start' }) },
    );
    expect(linkClm.status).toBe(201);

    const unlinkClm = await deleteContributionClaim(
      new NextRequest(
        `http://localhost/api/contributions/contrib-rl-cold-start/claims?claimId=${clmId}`,
        { method: 'DELETE' },
      ),
      { params: Promise.resolve({ id: 'contrib-rl-cold-start' }) },
    );
    expect(unlinkClm.status).toBe(200);
    expect((await unlinkClm.json()).canonicalClaimPreserved).toBe(true);
    expect(getClaimById(clmId)).not.toBeNull();

    // Relationship update & delete (normalized ClaimEvidenceLink composite key)
    linkClaimEvidence({
      claimId: clmId,
      evidenceId: evId,
      relationship: 'SUPPORTS',
      assertionMethod: 'AI_SUGGESTED',
      rationale: 'Initial proposed link.',
      confidence: 0.72,
      assertedBy: 'local-contributor',
    });
    const relKey = encodeURIComponent(`${clmId}:${evId}`);
    const patched = await patchRelationship(
      jsonReq(`http://localhost/api/relationships/${relKey}`, 'PATCH', {
        status: 'ACCEPTED',
        rationale: 'Human verified against Table 2.',
      }),
      { params: Promise.resolve({ id: relKey }) },
    );
    expect(patched.status).toBe(200);
    expect((await patched.json()).relationship.status).toBe('ACCEPTED');

    const deleted = await deleteRelationship(
      new NextRequest(`http://localhost/api/relationships/${relKey}`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: relKey }) },
    );
    expect(deleted.status).toBe(200);
    expect((await deleted.json()).deleted).toBe(true);
  });

  it('edits/soft-deletes discussion comments, submits anonymous formal reviews with redaction, updates workspaces, and deduplicates tool URL imports', async () => {
    const disc = listDiscussions()[0];
    const comment = disc.comments[0];

    const editComment = await patchDiscussionComment(
      jsonReq(
        `http://localhost/api/discussions/${disc.id}/comments/${comment.id}`,
        'PATCH',
        { body: 'Clarified experimental seed setup.' },
      ),
      { params: Promise.resolve({ id: disc.id, commentId: comment.id }) },
    );
    expect(editComment.status).toBe(200);
    expect((await editComment.json()).comment.body).toContain('Clarified');

    const softDel = await deleteDiscussionComment(
      new NextRequest(
        `http://localhost/api/discussions/${disc.id}/comments/${comment.id}`,
        { method: 'DELETE' },
      ),
      { params: Promise.resolve({ id: disc.id, commentId: comment.id }) },
    );
    expect(softDel.status).toBe(200);
    expect((await softDel.json()).softDeleted).toBe(true);

    // Formal review GET, PATCH, and POST /submit preserve anonymous redaction
    const review = listFormalReviews()[0];
    const getRev = await getReviewById(
      new NextRequest(`http://localhost/api/reviews/${review.id}`),
      { params: Promise.resolve({ id: review.id }) },
    );
    expect(getRev.status).toBe(200);

    const patchRev = await patchReviewById(
      jsonReq(`http://localhost/api/reviews/${review.id}`, 'PATCH', {
        scope: 'Updated methodological checklist',
      }),
      { params: Promise.resolve({ id: review.id }) },
    );
    expect(patchRev.status).toBe(200);

    const submitRev = await postSubmitReviewVerdict(
      jsonReq(`http://localhost/api/reviews/${review.id}/submit`, 'POST', {
        recommendation: 'MINOR_REVISION',
        summary: 'Strong empirical baseline; add variance bars on Table 2.',
      }),
      { params: Promise.resolve({ id: review.id }) },
    );
    expect(submitRev.status).toBe(200);
    const submittedData = await submitRev.json();
    expect(submittedData.review.status).toBe('SUBMITTED');
    expect(submittedData.review.recommendation).toBe('MINOR_REVISION');
    if (submittedData.review.anonymous) {
      expect(submittedData.review.reviewerId).toBeNull();
    }

    // Workspace GET & member-checked PATCH
    const wsGet = await getWorkspaceByIdRoute(
      new NextRequest('http://localhost/api/workspaces/ws-open-reasoning'),
      { params: Promise.resolve({ id: 'ws-open-reasoning' }) },
    );
    expect(wsGet.status).toBe(200);

    activeActorId = 'outsider-user';
    activeActorEditor = false;
    const wsDenied = await patchWorkspaceByIdRoute(
      jsonReq('http://localhost/api/workspaces/ws-open-reasoning', 'PATCH', {
        name: 'Hijack Attempt',
      }),
      { params: Promise.resolve({ id: 'ws-open-reasoning' }) },
    );
    expect(wsDenied.status).toBe(403);

    activeActorId = 'local-contributor';
    activeActorEditor = true;
    const wsOk = await patchWorkspaceByIdRoute(
      jsonReq('http://localhost/api/workspaces/ws-open-reasoning', 'PATCH', {
        name: 'Open Reasoning & Replication Lab',
      }),
      { params: Promise.resolve({ id: 'ws-open-reasoning' }) },
    );
    expect(wsOk.status).toBe(200);

    // Deduplicated ToolRepository URL import + GET/PATCH /api/tools/[id]
    const imp1 = await postImportTool(
      jsonReq('http://localhost/api/tools/import', 'POST', {
        repoUrl: 'https://github.com/sgl-project/sglang',
        license: 'Apache-2.0',
        primaryLanguage: 'Python',
      }),
    );
    expect(imp1.status).toBe(201);
    const imp1Data = await imp1.json();
    expect(imp1Data.created).toBe(true);

    const imp2 = await postImportTool(
      jsonReq('http://localhost/api/tools/import', 'POST', {
        repoUrl: 'https://github.com/sgl-project/sglang',
      }),
    );
    expect(imp2.status).toBe(200);
    expect((await imp2.json()).deduplicated).toBe(true);

    const toolGet = await getToolByIdRoute(
      new NextRequest(`http://localhost/api/tools/${imp1Data.tool.slug}`),
      { params: Promise.resolve({ id: imp1Data.tool.slug }) },
    );
    expect(toolGet.status).toBe(200);

    const toolPatch = await patchToolByIdRoute(
      jsonReq(`http://localhost/api/tools/${imp1Data.tool.id}`, 'PATCH', {
        latestTag: 'v0.4.6',
        stars: 14500,
      }),
      { params: Promise.resolve({ id: imp1Data.tool.id }) },
    );
    expect(toolPatch.status).toBe(200);
    expect((await toolPatch.json()).tool.latestReleaseTag).toBe('v0.4.6');
  });

  it('verifies AI entailment (entailed, contradicted, restricted external guard), safe notification read-all without touching attention, search suggestions, devices/push/sync, profiles, portable export, and dashboard modules', async () => {
    // 1. AI entailment check
    const entailed = await postCheckEntailment(
      jsonReq('http://localhost/api/ai/check-entailment', 'POST', {
        targetId: 'contrib-rl-cold-start',
        claimText: 'Cold-start SFT stabilizes output readability across reasoning benchmarks.',
        evidenceExcerpts: [
          'Cold-start SFT stabilizes output readability across math and reasoning benchmarks.',
        ],
      }),
    );
    expect(entailed.status).toBe(200);
    expect((await entailed.json()).verdict).toBe('ENTAILED');

    const contradicted = await postCheckEntailment(
      jsonReq('http://localhost/api/ai/check-entailment', 'POST', {
        targetId: 'contrib-rl-cold-start',
        claimText: 'Cold-start SFT never stabilizes output readability across reasoning benchmarks.',
        evidenceExcerpts: [
          'Cold-start SFT stabilizes output readability across math and reasoning benchmarks.',
        ],
      }),
    );
    expect((await contradicted.json()).verdict).toBe('CONTRADICTED');

    const restricted = await postCheckEntailment(
      jsonReq('http://localhost/api/ai/check-entailment', 'POST', {
        targetId: 'contrib-rl-cold-start',
        claimText: 'Private trial results confirm biomarker sensitivity.',
        evidenceExcerpts: ['Private trial cohort shows 94% sensitivity.'],
        provider: 'external-public-llm',
        classification: 'RESTRICTED',
      }),
    );
    expect(restricted.status).toBe(403);

    // 2. Notifications include safePreview + read-all leaves Attention Queue untouched
    const notifBefore = await getNotifications();
    const notifData = await notifBefore.json();
    expect(notifData.notifications[0].safePreview).toBeTruthy();
    const openAttentionBefore = listAttentionItems('local-contributor').filter(
      (a) => a.status === 'OPEN',
    ).length;

    const readAll = await postNotificationsReadAll(
      new NextRequest('http://localhost/api/notifications/read-all', { method: 'POST' }),
    );
    expect(readAll.status).toBe(200);
    const readAllData = await readAll.json();
    expect(readAllData.attentionItemsUnaffected).toBe(true);
    expect(readAllData.openAttentionCount).toBe(openAttentionBefore);

    // 3. Search suggestions
    const sugg = await getSearchSuggestionsRoute(
      new NextRequest('http://localhost/api/search/suggestions?q=Paged'),
    );
    expect(sugg.status).toBe(200);
    expect((await sugg.json()).total).toBeGreaterThanOrEqual(1);

    // 4. Devices + Push Subscriptions + cascade revocation on device delete
    const devCreate = await postDevices(
      jsonReq('http://localhost/api/devices', 'POST', {
        label: 'Field Tablet PWA',
        platform: 'pwa',
      }),
    );
    expect(devCreate.status).toBe(201);
    const { device } = await devCreate.json();

    const devList = await getDevices();
    expect((await devList.json()).total).toBeGreaterThanOrEqual(2);

    const subCreate = await postPushSub(
      jsonReq('http://localhost/api/push/subscriptions', 'POST', {
        deviceId: device.id,
        endpoint: 'https://push.example.org/sub/12345',
        p256dh: 'BEl62iUYgUivxIkv69yViEuiBIa',
        authSecret: 'tBHItJI5svbpez7KI4CCXg',
      }),
    );
    expect(subCreate.status).toBe(201);
    const { subscription } = await subCreate.json();
    expect(subscription.classificationSafePreview).toBe(true);

    const subsBefore = await getPushSubs();
    expect((await subsBefore.json()).total).toBe(1);

    // Revoking device cascades to its bound push subscription (Part V §15.3)
    const devRevoke = await deleteDevice(
      new NextRequest(`http://localhost/api/devices/${device.id}`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: device.id }) },
    );
    expect(devRevoke.status).toBe(200);
    expect((await devRevoke.json()).revokedPushSubscriptions).toBe(1);

    // Independent push unsubscribe returns 404 after cascade already revoked it
    const subDel = await deletePushSub(
      new NextRequest(`http://localhost/api/push/subscriptions?id=${subscription.id}`, {
        method: 'DELETE',
      }),
    );
    expect(subDel.status).toBe(404);

    // 5. Incremental Mobile/PWA Delta Sync
    const syncGoals = await getSyncDeltaRoute(
      new NextRequest('http://localhost/api/sync/goals'),
      { params: Promise.resolve({ resourceType: 'goals' }) },
    );
    expect(syncGoals.status).toBe(200);
    expect((await syncGoals.json()).nextCursor).toBeTruthy();

    const syncBad = await getSyncDeltaRoute(
      new NextRequest('http://localhost/api/sync/unknown-collection'),
      { params: Promise.resolve({ resourceType: 'unknown-collection' }) },
    );
    expect(syncBad.status).toBe(400);

    // 6. Contributor Profile, Public Profile, Portable SHA-256 Data Export & Dashboard Module layout
    const myProf = await getMyProfile();
    expect(myProf.status).toBe(200);

    const patchedProf = await patchMyProfile(
      jsonReq('http://localhost/api/me/profile', 'PATCH', {
        bio: 'Updated open-science methodological reviewer bio.',
        orcidId: '0000-0002-1825-0097',
      }),
    );
    expect(patchedProf.status).toBe(200);
    expect((await patchedProf.json()).profile.bio).toContain('Updated open-science');

    const pubProf = await getPublicProfile(
      new NextRequest('http://localhost/api/profiles/myself-aas'),
      { params: Promise.resolve({ username: 'myself-aas' }) },
    );
    expect(pubProf.status).toBe(200);
    expect((await pubProf.json()).profile.affiliations.length).toBeGreaterThanOrEqual(1);

    const exportRes = await getMyExport(new NextRequest('http://localhost/api/me/export'));
    expect(exportRes.status).toBe(200);
    const expData = await exportRes.json();
    const expectedSha = crypto
      .createHash('sha256')
      .update(JSON.stringify(expData.bundle), 'utf8')
      .digest('hex');
    expect(expData.checksumSha256).toBe(expectedSha);
    expect(exportRes.headers.get('X-Export-Checksum-SHA256')).toBe(expectedSha);

    const modRes = await patchDashboardModule(
      jsonReq('http://localhost/api/dashboard/modules/research-goals', 'PATCH', {
        pinned: true,
        order: 1,
      }),
      { params: Promise.resolve({ moduleKey: 'research-goals' }) },
    );
    expect(modRes.status).toBe(200);
    expect((await modRes.json()).module.pinned).toBe(true);
  });
});
