import { beforeEach, describe, expect, it } from 'vitest';
import { resetV34StoreForTesting } from '@/lib/v34/store';
import { POST as resolveSource } from '@/app/api/sources/resolve/route';
import { GET as getSource } from '@/app/api/sources/[id]/route';
import { POST as recordIntegrity } from '@/app/api/sources/[id]/integrity-events/route';
import { POST as createEvidenceRoute } from '@/app/api/evidence/route';
import { POST as createClaimRoute } from '@/app/api/claims/route';
import { POST as createRelationshipRoute } from '@/app/api/relationships/route';
import { GET as listContribs, POST as createContrib } from '@/app/api/contributions/route';
import { POST as publishContrib } from '@/app/api/contributions/[id]/publish/route';
import { POST as autosaveDraftRoute } from '@/app/api/drafts/[id]/autosave/route';
import { GET as getDraftHistoryRoute } from '@/app/api/drafts/[id]/history/route';
import { POST as resolveConflictRoute } from '@/app/api/drafts/[id]/resolve-conflict/route';
import { GET as getFeedRoute } from '@/app/api/feed/route';
import { GET as getLibraryRoute, POST as saveLibraryRoute, DELETE as deleteLibraryRoute } from '@/app/api/library/route';
import { GET as getGoalsRoute, POST as createGoalRoute, PATCH as updateGoalRoute } from '@/app/api/goals/route';

function jsonReq(url: string, method: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe('v3.4 Research Network API routes', () => {
  beforeEach(() => {
    resetV34StoreForTesting();
  });

  it('resolves canonical sources idempotently and links evidence, claims, and explicit relationships', async () => {
    const res1 = await resolveSource(
      jsonReq('http://localhost/api/sources/resolve', 'POST', {
        query: '10.1038/s41586-026-00042-9',
        title: 'Reproducible Benchmarks in Open Science',
      }),
    );
    expect(res1.status).toBe(201);
    const { source, version } = (await res1.json()) as {
      source: { id: string };
      version: { id: string };
    };

    // Resolving same DOI returns existing canonical record (200)
    const res2 = await resolveSource(
      jsonReq('http://localhost/api/sources/resolve', 'POST', {
        query: 'https://doi.org/10.1038/s41586-026-00042-9',
      }),
    );
    expect(res2.status).toBe(200);
    const second = (await res2.json()) as { source: { id: string }; created: boolean };
    expect(second.source.id).toBe(source.id);
    expect(second.created).toBe(false);

    // Attach structured evidence with exact locator
    const evRes = await createEvidenceRoute(
      jsonReq('http://localhost/api/evidence', 'POST', {
        sourceId: source.id,
        sourceVersionId: version.id,
        statement: 'Open benchmark harness reduced variance across 12 labs by 34%.',
        locator: { kind: 'table', value: 'Table 4' },
        extractionType: 'quantitative',
      }),
    );
    expect(evRes.status).toBe(201);
    const { evidence } = (await evRes.json()) as { evidence: { id: string } };

    // Create claim and AI-suggested relationship (must stay PROPOSED!)
    const claimRes = await createClaimRoute(
      jsonReq('http://localhost/api/claims', 'POST', {
        claimType: 'empirical',
        statement: 'Standardized harnesses measurably lower cross-lab benchmark variance.',
      }),
    );
    expect(claimRes.status).toBe(201);
    const { claim } = (await claimRes.json()) as { claim: { id: string } };

    const relRes = await createRelationshipRoute(
      jsonReq('http://localhost/api/relationships', 'POST', {
        kind: 'claim-evidence',
        claimId: claim.id,
        evidenceId: evidence.id,
        relationship: 'SUPPORTS',
        assertionMethod: 'AI_SUGGESTED',
        confidence: 0.88,
      }),
    );
    expect(relRes.status).toBe(201);
    const relBody = (await relRes.json()) as { relationship: { status: string; relationship: string } };
    expect(relBody.relationship.status).toBe('PROPOSED');
    expect(relBody.relationship.relationship).toBe('SUPPORTS');
  });

  it('propagates source retraction and blocks publishing until retraction is addressed', async () => {
    const srcRes = await resolveSource(
      jsonReq('http://localhost/api/sources/resolve', 'POST', {
        query: 'arXiv:2601.99999',
        title: 'Contested Preprint Study',
      }),
    );
    const { source, version } = (await srcRes.json()) as {
      source: { id: string };
      version: { id: string };
    };

    // Record retraction integrity event
    const ieRes = await recordIntegrity(
      jsonReq(`http://localhost/api/sources/${source.id}/integrity-events`, 'POST', {
        status: 'retracted',
        summary: 'Data fabrication confirmed by institutional audit.',
        disposition: 'publication-blocked',
      }),
      { params: Promise.resolve({ id: source.id }) },
    );
    expect(ieRes.status).toBe(201);

    const srcDetail = await getSource(new Request(`http://localhost/api/sources/${source.id}`), {
      params: Promise.resolve({ id: source.id }),
    });
    const srcJson = (await srcDetail.json()) as { source: { integrityStatus: string } };
    expect(srcJson.source.integrityStatus).toBe('retracted');

    // Create contribution citing retracted source
    const contribRes = await createContrib(
      jsonReq('http://localhost/api/contributions', 'POST', {
        contributionType: 'paper-review',
        title: 'Review of Contested Preprint Study',
        summary: 'Analyzing the claims and methodology of the contested preprint study.',
        primarySourceId: source.id,
        primarySourceVersionId: version.id,
        document: {
          schemaVersion: '1.0',
          id: 'doc-ret',
          title: 'Review of Contested Preprint Study',
          authorId: 'u1',
          workspaceId: 'w1',
          version: 1,
          createdAt: '2026-11-16T00:00:00.000Z',
          updatedAt: '2026-11-16T00:00:00.000Z',
          blocks: [{ id: 'b1', type: 'paragraph', text: 'Detailed analysis of reported results.' }],
        },
      }),
    );
    expect(contribRes.status).toBe(201);
    const { contribution } = (await contribRes.json()) as { contribution: { id: string } };

    // Attempting to publish WITHOUT addressing retraction -> 422 blocked!
    const blocked = await publishContrib(
      jsonReq(`http://localhost/api/contributions/${contribution.id}/publish`, 'POST', {
        retractionAddressed: false,
      }),
      { params: Promise.resolve({ id: contribution.id }) },
    );
    expect(blocked.status).toBe(422);
    const blockedBody = (await blocked.json()) as { blockers: Array<{ code: string }> };
    expect(blockedBody.blockers.some((b) => b.code === 'UNREVIEWED_RETRACTION_IMPACT')).toBe(true);

    // Addressing retraction explicitly -> 200 published!
    const published = await publishContrib(
      jsonReq(`http://localhost/api/contributions/${contribution.id}/publish`, 'POST', {
        retractionAddressed: true,
      }),
      { params: Promise.resolve({ id: contribution.id }) },
    );
    expect(published.status).toBe(200);
  });

  it('enforces idempotent autosave replay, optimistic concurrency 409, and conflict resolution', async () => {
    const draftId = 'draft-concurrency-test';
    const baseDoc = {
      schemaVersion: '1.0' as const,
      id: draftId,
      title: 'Concurrency Paper Review',
      authorId: 'local-contributor',
      workspaceId: 'personal',
      version: 1,
      createdAt: '2026-11-16T00:00:00.000Z',
      updatedAt: '2026-11-16T00:00:00.000Z',
      blocks: [{ id: 'b1', type: 'paragraph' as const, text: 'Version 1 body.' }],
    };

    // Initial save -> v1
    const first = await autosaveDraftRoute(
      jsonReq(`http://localhost/api/drafts/${draftId}/autosave`, 'POST', {
        mutationId: 'mut-unique-1',
        baseVersion: 0,
        contributionType: 'paper-review',
        title: baseDoc.title,
        document: baseDoc,
      }),
      { params: Promise.resolve({ id: draftId }) },
    );
    expect(first.status).toBe(200);
    const firstJson = (await first.json()) as { draft: { version: number }; replayed: boolean };
    expect(firstJson.draft.version).toBe(1);
    expect(firstJson.replayed).toBe(false);

    // Duplicate retry with identical mutationId -> idempotent replay (still v1!)
    const replay = await autosaveDraftRoute(
      jsonReq(`http://localhost/api/drafts/${draftId}/autosave`, 'POST', {
        mutationId: 'mut-unique-1',
        baseVersion: 0,
        contributionType: 'paper-review',
        title: baseDoc.title,
        document: baseDoc,
      }),
      { params: Promise.resolve({ id: draftId }) },
    );
    expect(replay.status).toBe(200);
    const replayJson = (await replay.json()) as { draft: { version: number }; replayed: boolean };
    expect(replayJson.draft.version).toBe(1);
    expect(replayJson.replayed).toBe(true);

    // Valid update -> v2
    const second = await autosaveDraftRoute(
      jsonReq(`http://localhost/api/drafts/${draftId}/autosave`, 'POST', {
        mutationId: 'mut-unique-2',
        baseVersion: 1,
        contributionType: 'paper-review',
        title: baseDoc.title,
        document: { ...baseDoc, blocks: [{ id: 'b1', type: 'paragraph', text: 'Version 2 server body.' }] },
      }),
      { params: Promise.resolve({ id: draftId }) },
    );
    expect(second.status).toBe(200);

    // Stale client submitting baseVersion=1 -> 409 preserving BOTH versions!
    const stale = await autosaveDraftRoute(
      jsonReq(`http://localhost/api/drafts/${draftId}/autosave`, 'POST', {
        mutationId: 'mut-stale-3',
        baseVersion: 1,
        contributionType: 'paper-review',
        title: baseDoc.title,
        document: { ...baseDoc, blocks: [{ id: 'b1', type: 'paragraph', text: 'Conflicting client body.' }] },
      }),
      { params: Promise.resolve({ id: draftId }) },
    );
    expect(stale.status).toBe(409);
    const staleJson = (await stale.json()) as {
      conflict: { serverVersion: number; serverDocument: { blocks: Array<{ text: string }> }; clientDocument: { blocks: Array<{ text: string }> } };
    };
    expect(staleJson.conflict.serverVersion).toBe(2);
    expect(staleJson.conflict.serverDocument.blocks[0].text).toContain('Version 2');
    expect(staleJson.conflict.clientDocument.blocks[0].text).toContain('Conflicting client');

    // History captures conflict snapshot
    const historyRes = await getDraftHistoryRoute(new Request(`http://localhost/api/drafts/${draftId}/history`), {
      params: Promise.resolve({ id: draftId }),
    });
    expect(historyRes.status).toBe(200);
    const historyJson = (await historyRes.json()) as { snapshots: Array<{ reason: string }> };
    expect(historyJson.snapshots.some((s) => s.reason === 'conflict')).toBe(true);

    // Resolve conflict -> advances cleanly to v3
    const resolved = await resolveConflictRoute(
      jsonReq(`http://localhost/api/drafts/${draftId}/resolve-conflict`, 'POST', {
        strategy: 'merge',
        expectedServerVersion: 2,
        mergedDocument: {
          ...baseDoc,
          blocks: [
            { id: 'b1', type: 'paragraph', text: 'Version 2 server body.' },
            { id: 'b2', type: 'paragraph', text: 'Conflicting client body.' },
          ],
        },
      }),
      { params: Promise.resolve({ id: draftId }) },
    );
    expect(resolved.status).toBe(200);
    const resolvedJson = (await resolved.json()) as { draft: { version: number } };
    expect(resolvedJson.draft.version).toBe(3);
  });

  it('serves unified feed, library CRUD, and personal research goals', async () => {
    const feedRes = await getFeedRoute(new Request('http://localhost/api/feed'));
    expect(feedRes.status).toBe(200);
    const feedJson = (await feedRes.json()) as { items: Array<{ kind: string }> };
    expect(feedJson.items.some((i) => i.kind === 'contribution')).toBe(true);

    const listRes = await listContribs(new Request('http://localhost/api/contributions'));
    expect(listRes.status).toBe(200);

    // Library save -> list -> delete
    const saveRes = await saveLibraryRoute(
      jsonReq('http://localhost/api/library', 'POST', {
        itemType: 'contribution',
        itemId: 'contrib-rl-cold-start',
        title: 'Pure RL vs. Cold-Start SFT',
        url: '/contribution/pure-rl-vs-cold-start-sft-reasoning-models',
        collection: 'Reasoning Review',
      }),
    );
    expect(saveRes.status).toBe(201);

    const libRes = await getLibraryRoute();
    const libJson = (await libRes.json()) as { items: Array<{ itemId: string }> };
    expect(libJson.items.some((i) => i.itemId === 'contrib-rl-cold-start')).toBe(true);

    const delRes = await deleteLibraryRoute(
      new Request('http://localhost/api/library?itemType=contribution&itemId=contrib-rl-cold-start', {
        method: 'DELETE',
      }),
    );
    expect(delRes.status).toBe(200);

    // Goals create -> list -> update progress to completion
    const goalCreate = await createGoalRoute(
      jsonReq('http://localhost/api/goals', 'POST', {
        title: 'Verify 2 replication scripts',
        metric: 'REPLICATIONS_DOCUMENTED',
        targetValue: 2,
        currentValue: 1,
        period: 'WEEKLY',
      }),
    );
    expect(goalCreate.status).toBe(201);
    const { goal } = (await goalCreate.json()) as { goal: { id: string } };

    const goalPatch = await updateGoalRoute(
      jsonReq('http://localhost/api/goals', 'PATCH', {
        id: goal.id,
        currentValue: 2,
      }),
    );
    expect(goalPatch.status).toBe(200);
    const patched = (await goalPatch.json()) as { goal: { status: string } };
    expect(patched.goal.status).toBe('COMPLETED');

    const goalsList = await getGoalsRoute();
    expect(goalsList.status).toBe(200);
  });
});
