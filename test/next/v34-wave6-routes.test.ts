import crypto from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getSearch } from '@/app/api/search/route';
import { POST as postSearchExpand } from '@/app/api/search/expand/route';
import { POST as postValidateCitations } from '@/app/api/ai/validate-citations/route';
import { POST as postCheckQuotation } from '@/app/api/ai/check-quotation/route';
import { GET as getAiProvenance, PATCH as patchAiProvenance } from '@/app/api/ai/provenance/route';
import { GET as getDashboardHome } from '@/app/api/dashboard/home/route';
import { POST as postMigrateBookmarks } from '@/app/api/library/migrate-bookmarks/route';
import { POST as postSubmitReview } from '@/app/api/contributions/[id]/submit-review/route';
import { POST as postArchiveContribution } from '@/app/api/contributions/[id]/archive/route';
import { GET as getContributionVersions } from '@/app/api/contributions/[id]/versions/route';
import { POST as postPublishContribution } from '@/app/api/contributions/[id]/publish/route';
import { POST as postDraftAutosave } from '@/app/api/drafts/[id]/autosave/route';
import { GET as getDraftHistory } from '@/app/api/drafts/[id]/history/route';
import { POST as postDraftRestore } from '@/app/api/drafts/[id]/restore/route';
import { POST as postExports } from '@/app/api/exports/route';
import { GET as getExportById } from '@/app/api/exports/[id]/route';
import {
  GET as getWorkspaceInvitations,
  POST as postWorkspaceInvitations,
} from '@/app/api/workspaces/[id]/invitations/route';
import { resetAiGovernanceForTesting } from '@/lib/v34/ai-governance';
import { resetExportsStoreForTesting } from '@/lib/v34/exports';
import { resetIdempotencyStoreForTesting } from '@/lib/v34/idempotency';
import { buildNotificationDedupeKey, notificationPreview } from '@/lib/v34/notifications-safe';
import {
  createContribution,
  listClaims,
  listEvidence,
  resetV34StoreForTesting,
} from '@/lib/v34/store';
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
        name: 'Test Researcher',
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

describe('ResearchWithME v3.4 Wave 6 — Search, AI Governance, Lifecycle, Exports & Safe Notifications', () => {
  beforeEach(() => {
    activeActorId = 'local-contributor';
    resetIdempotencyStoreForTesting();
    resetV34StoreForTesting();
    resetWave2StoreForTesting();
    resetWave3StoreForTesting();
    resetWave5StoreForTesting();
    resetAiGovernanceForTesting();
    resetExportsStoreForTesting();
  });

  it('executes unified multi-entity search with match-reason disclosure, identifier lookup, and editable expansion terms', async () => {
    const lexRes = await getSearch(new NextRequest('http://localhost/api/search?q=PagedAttention'));
    expect(lexRes.status).toBe(200);
    const lexData = await lexRes.json();
    expect(lexData.mode).toBe('lexical');
    expect(lexData.total).toBeGreaterThanOrEqual(2);
    expect(lexData.hits[0].matchReason).toBeTruthy();

    // Normalized arXiv identifier lookup
    const idRes = await getSearch(
      new NextRequest('http://localhost/api/search?q=arXiv:2501.12948&type=source'),
    );
    expect(idRes.status).toBe(200);
    const idData = await idRes.json();
    expect(idData.mode).toBe('identifier');
    expect(idData.hits[0].type).toBe('source');
    expect(idData.hits[0].matchReason).toContain('ARXIV');

    // Transparent editable search expansion with exclusions
    const expRes = await postSearchExpand(
      jsonReq('http://localhost/api/search/expand', 'POST', {
        query: 'GRPO cold-start reasoning',
        excludeTerms: ['SFT'],
      }),
    );
    expect(expRes.status).toBe(200);
    const expData = await expRes.json();
    expect(expData.suggestedTerms.length).toBeGreaterThan(0);
    expect(expData.suggestedTerms.some((t: { term: string }) => t.term === 'SFT')).toBe(false);
    expect(expData.suggestedTerms.every((t: { removable: boolean }) => t.removable === true)).toBe(true);
  });

  it('enforces AI provenance, citation validation, prohibited external processing, and quotation mismatch publish blocker', async () => {
    // 1. Prohibited external provider on RESTRICTED material fails closed (403)
    const prohibited = await postValidateCitations(
      jsonReq('http://localhost/api/ai/validate-citations', 'POST', {
        targetId: 'contrib-rl-cold-start',
        sourceIds: ['src-arxiv-2501-12948'],
        provider: 'external-public-llm',
        model: 'third-party-1',
        classification: 'RESTRICTED',
      }),
    );
    expect(prohibited.status).toBe(403);
    expect((await prohibited.json()).code).toBe('PROHIBITED_EXTERNAL_PROCESSING');

    // 2. Valid canonical sources + claims pass citation validation and log AI provenance
    const validCit = await postValidateCitations(
      jsonReq('http://localhost/api/ai/validate-citations', 'POST', {
        targetId: 'contrib-rl-cold-start',
        sourceIds: ['src-arxiv-2501-12948'],
        evidenceIds: ['ev-grpo-emergence'],
        claimIds: ['clm-rl-reasoning-tradeoff'],
      }),
    );
    expect(validCit.status).toBe(200);
    const validData = await validCit.json();
    expect(validData.passed).toBe(true);
    expect(validData.provenance.citationValidationStatus).toBe('PASSED');

    // 3. Create a draft contribution and trigger a QUOTATION_MISMATCH check against it
    const draftContrib = createContribution({
      authorId: 'local-contributor',
      authorHandle: 'local-contributor',
      authorName: 'Test Researcher',
      contributionType: 'replication-report',
      title: 'Replication audit of reasoning checkpoint decoding',
      summary: 'Detailed replication with strict quotation verification.',
      document: {
        schemaVersion: '1.0',
        id: 'doc-quote-test',
        title: 'Replication audit of reasoning checkpoint decoding',
        authorId: 'local-contributor',
        workspaceId: 'ws-open-reasoning',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        blocks: [
          {
            id: 'b-1',
            type: 'paragraph',
            text: 'We verified Table 2 metrics across two independent seeds.',
          },
        ],
      },
      primarySourceId: 'src-arxiv-2501-12948',
      primarySourceVersionId: 'sv-arxiv-2501-12948-v1',
      evidenceIds: ['ev-grpo-emergence'],
      claimIds: ['clm-rl-reasoning-tradeoff'],
      topics: ['Reasoning Models'],
      tags: ['replication'],
      limitations: ['Limited to 7B and 14B open checkpoints.'],
    });

    const mismatchRes = await postCheckQuotation(
      jsonReq('http://localhost/api/ai/check-quotation', 'POST', {
        targetId: draftContrib.id,
        sourceId: 'src-arxiv-2501-12948',
        quotedText: 'Completely fabricated claim not present in excerpt.',
        sourceExcerpt: 'Cold-start SFT stabilizes output readability across math and code tasks.',
        locatorLabel: 'Section 3.2',
      }),
    );
    expect(mismatchRes.status).toBe(200);
    const mismatchData = await mismatchRes.json();
    expect(mismatchData.matched).toBe(false);
    expect(mismatchData.blocker.code).toBe('QUOTATION_MISMATCH');

    // Publish must be BLOCKED (422 QUOTATION_MISMATCH) until human resolves/approves
    const blockedPub = await postPublishContribution(
      jsonReq(`http://localhost/api/contributions/${draftContrib.id}/publish`, 'POST', {}),
      { params: Promise.resolve({ id: draftContrib.id }) },
    );
    expect(blockedPub.status).toBe(422);
    expect((await blockedPub.json()).code).toBe('QUOTATION_MISMATCH');

    // Human reviews & approves provenance record -> publish succeeds
    const listProv = await getAiProvenance(
      new NextRequest(`http://localhost/api/ai/provenance?targetId=${draftContrib.id}`),
    );
    expect((await listProv.json()).total).toBeGreaterThanOrEqual(1);

    const approveRes = await patchAiProvenance(
      jsonReq('http://localhost/api/ai/provenance', 'PATCH', {
        id: mismatchData.provenance.id,
        decision: 'APPROVED',
        reviewNotes: 'Quote corrected directly in manuscript text.',
      }),
    );
    expect(approveRes.status).toBe(200);
    expect((await approveRes.json()).record.humanReviewStatus).toBe('APPROVED');

    const okPub = await postPublishContribution(
      jsonReq(`http://localhost/api/contributions/${draftContrib.id}/publish`, 'POST', {}),
      { params: Promise.resolve({ id: draftContrib.id }) },
    );
    expect(okPub.status).toBe(200);
  });

  it('supports contribution submit-review, immutable version snapshots, archive preserving canonical objects, and draft restore', async () => {
    const evidenceCountBefore = listEvidence().length;
    const claimsCountBefore = listClaims().length;

    const submitRes = await postSubmitReview(
      jsonReq('http://localhost/api/contributions/contrib-rl-cold-start/submit-review', 'POST', {
        mode: 'ANONYMOUS',
        note: 'Ready for double-blind methodological review.',
      }),
      { params: Promise.resolve({ id: 'contrib-rl-cold-start' }) },
    );
    expect(submitRes.status).toBe(201);
    const submitData = await submitRes.json();
    expect(submitData.contribution.lifecycle).toBe('under-review');
    expect(submitData.review.anonymous).toBe(true);
    expect(submitData.review.reviewerId).toBeNull();

    const versionsRes = await getContributionVersions(
      new NextRequest('http://localhost/api/contributions/contrib-rl-cold-start/versions'),
      { params: Promise.resolve({ id: 'contrib-rl-cold-start' }) },
    );
    expect(versionsRes.status).toBe(200);
    expect((await versionsRes.json()).total).toBeGreaterThanOrEqual(2);

    const archiveRes = await postArchiveContribution(
      new NextRequest('http://localhost/api/contributions/contrib-rl-cold-start/archive', {
        method: 'POST',
      }),
      { params: Promise.resolve({ id: 'contrib-rl-cold-start' }) },
    );
    expect(archiveRes.status).toBe(200);
    expect((await archiveRes.json()).canonicalObjectsPreserved).toBe(true);
    // Part VIII §B: archiving a contribution NEVER deletes canonical evidence or claims
    expect(listEvidence().length).toBe(evidenceCountBefore);
    expect(listClaims().length).toBe(claimsCountBefore);

    // Draft autosave twice -> restore to v1 snapshot -> verify monotonic version + preserved history
    const docV1 = {
      schemaVersion: '1.0' as const,
      id: 'draft-restore-test',
      title: 'Original Draft Title V1',
      authorId: 'local-contributor',
      workspaceId: 'ws-open-reasoning',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      blocks: [
        {
          id: 'blk-1',
          type: 'paragraph' as const,
          text: 'Version one body text.',
        },
      ],
    };
    const save1 = await postDraftAutosave(
      jsonReq('http://localhost/api/drafts/draft-restore-test/autosave', 'POST', {
        baseVersion: 0,
        mutationId: 'mutation-restore-001',
        title: docV1.title,
        contributionType: 'paper-review',
        document: docV1,
      }),
      { params: Promise.resolve({ id: 'draft-restore-test' }) },
    );
    expect(save1.status).toBe(200);

    const save2 = await postDraftAutosave(
      jsonReq('http://localhost/api/drafts/draft-restore-test/autosave', 'POST', {
        baseVersion: 1,
        mutationId: 'mutation-restore-002',
        title: 'Accidental Overwrite V2',
        contributionType: 'paper-review',
        document: { ...docV1, title: 'Accidental Overwrite V2', version: 2 },
      }),
      { params: Promise.resolve({ id: 'draft-restore-test' }) },
    );
    expect(save2.status).toBe(200);

    const histRes = await getDraftHistory(
      new NextRequest('http://localhost/api/drafts/draft-restore-test/history'),
      { params: Promise.resolve({ id: 'draft-restore-test' }) },
    );
    const histData = await histRes.json();
    const v1Snap = histData.snapshots.find((s: { version: number }) => s.version === 1);
    expect(v1Snap).toBeTruthy();

    const restoreRes = await postDraftRestore(
      jsonReq('http://localhost/api/drafts/draft-restore-test/restore', 'POST', {
        snapshotId: v1Snap.id,
        expectedServerVersion: 2,
      }),
      { params: Promise.resolve({ id: 'draft-restore-test' }) },
    );
    expect(restoreRes.status).toBe(200);
    const restored = await restoreRes.json();
    expect(restored.draft.version).toBe(3);
    expect(restored.draft.title).toBe('Original Draft Title V1');
  });

  it('migrates legacy bookmarks idempotently, generates checksummed BibTeX/CSL-JSON exports, aggregates /api/dashboard/home, enforces workspace invitations, and redacts restricted notification previews', async () => {
    // 1. Legacy bookmark migration
    const migRes1 = await postMigrateBookmarks(
      jsonReq('http://localhost/api/library/migrate-bookmarks', 'POST', {
        bookmarks: [
          {
            id: 'legacy-art-1',
            title: 'Legacy Saved Article',
            url: '/post/legacy-art-1',
            itemType: 'article',
          },
        ],
      }),
    );
    expect(migRes1.status).toBe(201);
    expect((await migRes1.json()).migratedCount).toBe(1);

    // Re-running without duplicates skips existing
    const migRes2 = await postMigrateBookmarks(
      jsonReq('http://localhost/api/library/migrate-bookmarks', 'POST', {
        bookmarks: [
          {
            id: 'legacy-art-1',
            title: 'Legacy Saved Article',
            url: '/post/legacy-art-1',
            itemType: 'article',
          },
        ],
      }),
    );
    expect((await migRes2.json()).skippedCount).toBe(1);

    // 2. Checksummed BibTeX + CSL-JSON exports + download header verification
    const expRes = await postExports(
      jsonReq('http://localhost/api/exports', 'POST', {
        targetType: 'source',
        targetId: 'src-arxiv-2501-12948',
        format: 'bibtex',
      }),
    );
    expect(expRes.status).toBe(201);
    const { export: expRec } = await expRes.json();
    const expectedSha = crypto.createHash('sha256').update(expRec.payload, 'utf8').digest('hex');
    expect(expRec.checksumSha256).toBe(expectedSha);

    const dlRes = await getExportById(
      new NextRequest(`http://localhost/api/exports/${expRec.id}?download=1`),
      { params: Promise.resolve({ id: expRec.id }) },
    );
    expect(dlRes.status).toBe(200);
    expect(dlRes.headers.get('X-Export-Checksum-SHA256')).toBe(expectedSha);
    expect(await dlRes.text()).toContain('@misc{');

    // 3. Aggregated /api/dashboard/home
    const homeRes = await getDashboardHome(new Request('http://localhost/api/dashboard/home'));
    expect(homeRes.status).toBe(200);
    const home = await homeRes.json();
    expect(home.attentionQueue).toBeDefined();
    expect(home.notifications).toBeDefined();
    expect(home.researchGoals).toBeDefined();
    expect(home.assistantSuggestions).toBeDefined();
    expect(home.librarySummary.savedItemsCount).toBeGreaterThanOrEqual(1);
    expect(home.knowledgeSummary.sourcesCount).toBeGreaterThanOrEqual(2);

    // 4. Workspace invitations enforce active workspace membership
    activeActorId = 'outsider-99';
    const invForbidden = await postWorkspaceInvitations(
      jsonReq('http://localhost/api/workspaces/ws-open-reasoning/invitations', 'POST', {
        email: 'collab@university.edu',
        role: 'REVIEWER',
      }),
      { params: Promise.resolve({ id: 'ws-open-reasoning' }) },
    );
    expect(invForbidden.status).toBe(403);

    activeActorId = 'local-contributor';
    const invOk = await postWorkspaceInvitations(
      jsonReq('http://localhost/api/workspaces/ws-open-reasoning/invitations', 'POST', {
        email: 'collab@university.edu',
        role: 'REVIEWER',
      }),
      { params: Promise.resolve({ id: 'ws-open-reasoning' }) },
    );
    expect(invOk.status).toBe(201);

    const invList = await getWorkspaceInvitations(
      new NextRequest('http://localhost/api/workspaces/ws-open-reasoning/invitations'),
      { params: Promise.resolve({ id: 'ws-open-reasoning' }) },
    );
    expect((await invList.json()).total).toBe(1);

    // 5. Safe notification rendering + dedupe keys (Part V §12.2–§12.3)
    expect(
      notificationPreview('PUBLIC', { publicTitle: 'Public retraction alert on arXiv:2501' }),
    ).toBe('Public retraction alert on arXiv:2501');
    expect(
      notificationPreview('RESTRICTED', {
        publicTitle: 'Secret Clinical Trial Dataset Leak',
      }),
    ).not.toContain('Secret Clinical Trial');
    expect(
      buildNotificationDedupeKey({ kind: 'integrity', eventId: 'evt-1', userId: 'u-1' }),
    ).toBe('integrity:evt-1:u-1');
    expect(
      buildNotificationDedupeKey({
        kind: 'draft-conflict',
        draftId: 'd-1',
        userId: 'u-1',
        serverVersion: 4,
      }),
    ).toBe('draft-conflict:d-1:u-1:4');
  });
});
