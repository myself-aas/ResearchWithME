import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { resetV34StoreForTesting } from '@/lib/v34/store';
import { resetWave2StoreForTesting } from '@/lib/v34/wave2-store';
import { listAttentionItems, resetWave3StoreForTesting } from '@/lib/v34/wave3-store';
import { resetIdempotencyStoreForTesting } from '@/lib/v34/idempotency';

vi.mock('@/lib/supabase/config', () => ({
  isSupabaseConfigured: false,
}));

vi.mock('@/lib/cms/auth', () => ({
  getDashboardUser: vi.fn(async () => ({
    id: 'local-contributor',
    email: 'editor@researchwithme.org',
    name: 'Dr. Editor',
    isEditor: true,
    isAdmin: false,
  })),
  requireEditor: vi.fn(async () => ({
    ok: true,
    user: {
      id: 'local-contributor',
      email: 'editor@researchwithme.org',
      name: 'Dr. Editor',
      isEditor: true,
      isAdmin: false,
    },
  })),
}));

import { POST as createContributionRoute } from '@/app/api/contributions/route';
import { POST as publishContributionRoute } from '@/app/api/contributions/[id]/publish/route';
import { POST as createDiscussionRoute } from '@/app/api/discussions/route';
import { GET as listReviewsRoute } from '@/app/api/reviews/route';
import { POST as recordIntegrityRoute } from '@/app/api/sources/[id]/integrity-events/route';

function makeRequest(
  url: string,
  init?: { method?: string; body?: unknown; headers?: Record<string, string> },
): NextRequest {
  const headers = new Headers(init?.headers ?? {});
  let body: string | undefined;
  if (init?.body !== undefined) {
    headers.set('content-type', 'application/json');
    body = JSON.stringify(init.body);
  }
  return new NextRequest(url, { method: init?.method ?? 'GET', headers, body });
}

describe('v3.4 Wave 4 Hardening: Idempotency Keys & Retraction -> Attention Propagation', () => {
  beforeEach(() => {
    resetV34StoreForTesting();
    resetWave2StoreForTesting();
    resetWave3StoreForTesting();
    resetIdempotencyStoreForTesting();
  });

  it('§C.3 replays exact stored response for duplicate Idempotency-Key and rejects mismatched payload with 409 IDEMPOTENCY_CONFLICT', async () => {
    const payload = {
      objectType: 'contribution',
      objectId: 'contrib-rl-cold-start',
      title: 'Idempotent discussion thread test',
      initialBody: 'Should only be created once even if retried.',
    };

    const first = await createDiscussionRoute(
      makeRequest('http://localhost/api/discussions', {
        method: 'POST',
        headers: { 'Idempotency-Key': 'idem-disc-001' },
        body: payload,
      }),
    );
    expect(first.status).toBe(201);
    expect(first.headers.get('Idempotency-Key')).toBe('idem-disc-001');
    const firstJson = (await first.json()) as { discussion: { id: string } };

    // Retry with identical key & payload -> replayed without creating a second record
    const replay = await createDiscussionRoute(
      makeRequest('http://localhost/api/discussions', {
        method: 'POST',
        headers: { 'Idempotency-Key': 'idem-disc-001' },
        body: payload,
      }),
    );
    expect(replay.status).toBe(201);
    expect(replay.headers.get('X-Idempotency-Replayed')).toBe('true');
    const replayJson = (await replay.json()) as { discussion: { id: string } };
    expect(replayJson.discussion.id).toBe(firstJson.discussion.id);

    // Reusing the same Idempotency-Key with a different payload -> 409 IDEMPOTENCY_CONFLICT
    const conflict = await createDiscussionRoute(
      makeRequest('http://localhost/api/discussions', {
        method: 'POST',
        headers: { 'Idempotency-Key': 'idem-disc-001' },
        body: { ...payload, title: 'Different title under same key' },
      }),
    );
    expect(conflict.status).toBe(409);
    const conflictJson = (await conflict.json()) as { code: string };
    expect(conflictJson.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('§E.1 / §E.5 propagates source retraction into Attention Queue immediately and blocks publishing unaddressed drafts', async () => {
    // 1. Create a draft contribution grounded in src-arxiv-2501-12948
    const now = new Date().toISOString();
    const draftRes = await createContributionRoute(
      makeRequest('http://localhost/api/contributions', {
        method: 'POST',
        headers: { 'Idempotency-Key': 'idem-draft-retract-1' },
        body: {
          contributionType: 'paper-review',
          title: 'Draft Review Grounded in Target Paper',
          summary:
            'Draft contribution citing the target paper with structured evidence to test retraction propagation.',
          primarySourceId: 'src-arxiv-2501-12948',
          topics: ['Machine Learning'],
          document: {
            schemaVersion: '1.0',
            id: 'doc-retract-test',
            title: 'Draft Review Grounded in Target Paper',
            authorId: 'local-contributor',
            workspaceId: 'personal',
            version: 1,
            createdAt: now,
            updatedAt: now,
            blocks: [
              {
                id: 'blk-1',
                type: 'paragraph',
                text: 'Structured summary backed by primary paper table 2.',
                evidenceId: 'ev-r1-cold-start',
              },
            ],
          },
          evidenceIds: ['ev-r1-cold-start'],
          claimIds: ['claim-cold-start-readability'],
        },
      }),
    );
    expect(draftRes.status).toBe(201);
    const draft = ((await draftRes.json()) as { contribution: { id: string } }).contribution;

    // 2. Editor records a retraction integrity event on src-arxiv-2501-12948
    const integrityRes = await recordIntegrityRoute(
      makeRequest('http://localhost/api/sources/src-arxiv-2501-12948/integrity-events', {
        method: 'POST',
        body: {
          status: 'retracted',
          summary: 'Benchmark table contaminated by leaked evaluation subset.',
          disposition: 'publication-blocked',
        },
      }),
      { params: Promise.resolve({ id: 'src-arxiv-2501-12948' }) },
    );
    expect(integrityRes.status).toBe(201);
    const integrityJson = (await integrityRes.json()) as {
      affectedContributionIds: string[];
      propagatedAttentionCount: number;
    };
    expect(integrityJson.affectedContributionIds).toContain(draft.id);
    expect(integrityJson.propagatedAttentionCount).toBeGreaterThanOrEqual(1);

    // Attention Queue now contains a CRITICAL RETRACTION_IMPACT item immediately
    const attention = listAttentionItems('local-contributor');
    expect(
      attention.some(
        (item) =>
          item.kind === 'RETRACTION_IMPACT' &&
          item.severity === 'CRITICAL' &&
          item.objectId === 'src-arxiv-2501-12948',
      ),
    ).toBe(true);

    // 3. Attempting to publish without addressing the retraction is blocked (§E.5)
    const blockedRes = await publishContributionRoute(
      makeRequest(`http://localhost/api/contributions/${draft.id}/publish`, {
        method: 'POST',
        body: { retractionAddressed: false },
      }),
      { params: Promise.resolve({ id: draft.id }) },
    );
    expect(blockedRes.status).toBe(422);
    const blockedJson = (await blockedRes.json()) as {
      blockers: Array<{ code: string }>;
    };
    expect(blockedJson.blockers.some((b) => b.code === 'UNREVIEWED_RETRACTION_IMPACT')).toBe(true);

    // 4. Addressing the retraction clears the blocker and allows publication
    const publishedRes = await publishContributionRoute(
      makeRequest(`http://localhost/api/contributions/${draft.id}/publish`, {
        method: 'POST',
        headers: { 'Idempotency-Key': 'idem-publish-retract-1' },
        body: { retractionAddressed: true },
      }),
      { params: Promise.resolve({ id: draft.id }) },
    );
    expect(publishedRes.status).toBe(200);
  });

  it('§C.5 completely strips reviewerId, authorId, and reviewerHandle from serialized anonymous formal review responses', async () => {
    const res = await listReviewsRoute(
      makeRequest('http://localhost/api/reviews?contributionId=contrib-rl-cold-start'),
    );
    expect(res.status).toBe(200);
    const rawJson = await res.text();
    expect(rawJson).toContain('Anonymous reviewer');
    expect(rawJson).not.toContain('user-reviewer-1');
    expect(rawJson).not.toContain('dr-lin-eval');
  });
});
