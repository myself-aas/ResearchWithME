import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetV34StoreForTesting } from '@/lib/v34/store';
import { resetWave2StoreForTesting } from '@/lib/v34/wave2-store';

vi.mock('@/lib/supabase/config', () => ({
  isSupabaseConfigured: false,
}));

vi.mock('@/lib/cms/auth', () => ({
  getDashboardUser: async () => null,
}));

import { GET as getWorkspaces, POST as createWorkspaceRoute } from '@/app/api/workspaces/route';
import {
  GET as getWorkspaceMembers,
  POST as addWorkspaceMemberRoute,
} from '@/app/api/workspaces/[id]/members/route';
import { GET as getProjects, POST as createProjectRoute } from '@/app/api/projects/route';
import { GET as getProject, PATCH as patchProjectRoute } from '@/app/api/projects/[id]/route';
import { POST as addProjectMemberRoute } from '@/app/api/projects/[id]/members/route';
import {
  PATCH as patchMilestoneRoute,
  POST as createMilestoneRoute,
} from '@/app/api/projects/[id]/milestones/route';
import {
  DELETE as unlinkObjectRoute,
  POST as linkObjectRoute,
} from '@/app/api/projects/[id]/objects/route';
import { GET as getReviews, POST as createReviewRoute } from '@/app/api/reviews/route';
import {
  PATCH as patchReviewItemRoute,
  POST as addReviewItemRoute,
} from '@/app/api/reviews/[id]/items/route';
import { POST as addRebuttalRoute } from '@/app/api/reviews/[id]/rebuttals/route';
import { POST as recordDecisionRoute } from '@/app/api/reviews/[id]/decisions/route';
import {
  GET as getRelationships,
  PATCH as curateRelationship,
  POST as createRelationship,
} from '@/app/api/relationships/route';

function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe('v3.4 Wave 2 API routes: Workspaces, Projects, Formal Reviews & Provenance Curation', () => {
  beforeEach(() => {
    resetV34StoreForTesting();
    resetWave2StoreForTesting();
  });

  it('enforces §7 workspace membership boundary before assigning a project member', async () => {
    const wsRes = await createWorkspaceRoute(
      jsonRequest('http://localhost/api/workspaces', 'POST', {
        name: 'Replication Audit Collective',
        description: 'Cross-institution replication checks.',
      }),
    );
    expect(wsRes.status).toBe(201);
    const { workspace } = (await wsRes.json()) as { workspace: { id: string } };

    const projRes = await createProjectRoute(
      jsonRequest('http://localhost/api/projects', 'POST', {
        workspaceId: workspace.id,
        title: 'Benchmarks Verification Phase 1',
        objective: 'Audit published reasoning claims against open checkpoints with exact locators.',
        stage: 'SCOPING',
        topics: ['Machine Learning'],
      }),
    );
    expect(projRes.status).toBe(201);
    const { project } = (await projRes.json()) as { project: { id: string; slug: string } };

    // Attempt to add a non-workspace user directly to the project -> MUST reject with 403 WORKSPACE_MEMBERSHIP_REQUIRED
    const forbidden = await addProjectMemberRoute(
      jsonRequest(`http://localhost/api/projects/${project.id}/members`, 'POST', {
        userId: 'outsider-user-99',
        role: 'CONTRIBUTOR',
      }),
      { params: Promise.resolve({ id: project.id }) },
    );
    expect(forbidden.status).toBe(403);
    const errPayload = (await forbidden.json()) as { code: string };
    expect(errPayload.code).toBe('WORKSPACE_MEMBERSHIP_REQUIRED');

    // First add the user as an active workspace member
    const wsMemberRes = await addWorkspaceMemberRoute(
      jsonRequest(`http://localhost/api/workspaces/${workspace.id}/members`, 'POST', {
        userId: 'outsider-user-99',
        handle: 'dr-sato',
        displayName: 'Dr. Kenji Sato',
        role: 'REVIEWER',
      }),
      { params: Promise.resolve({ id: workspace.id }) },
    );
    expect(wsMemberRes.status).toBe(201);

    const wsMembersList = await getWorkspaceMembers(
      new Request(`http://localhost/api/workspaces/${workspace.id}/members`),
      { params: Promise.resolve({ id: workspace.id }) },
    );
    expect(((await wsMembersList.json()) as { total: number }).total).toBe(2);

    // Now assigning to the project succeeds cleanly!
    const allowed = await addProjectMemberRoute(
      jsonRequest(`http://localhost/api/projects/${project.id}/members`, 'POST', {
        userId: 'outsider-user-99',
        role: 'REVIEWER',
      }),
      { params: Promise.resolve({ id: project.id }) },
    );
    expect(allowed.status).toBe(201);
    const { member } = (await allowed.json()) as { member: { displayName: string; role: string } };
    expect(member.displayName).toBe('Dr. Kenji Sato');
    expect(member.role).toBe('REVIEWER');
  });

  it('supports project lifecycle updates, milestones, and linked canonical objects', async () => {
    const listRes = await getProjects(new Request('http://localhost/api/projects'));
    expect(listRes.status).toBe(200);
    const { projects } = (await listRes.json()) as { projects: Array<{ id: string; slug: string }> };
    expect(projects.length).toBeGreaterThanOrEqual(2);

    const target = projects[0];
    const patchRes = await patchProjectRoute(
      jsonRequest(`http://localhost/api/projects/${target.id}`, 'PATCH', {
        stage: 'UNDER_REVIEW',
      }),
      { params: Promise.resolve({ id: target.id }) },
    );
    expect(patchRes.status).toBe(200);
    expect(((await patchRes.json()) as { project: { stage: string } }).project.stage).toBe(
      'UNDER_REVIEW',
    );

    const msCreate = await createMilestoneRoute(
      jsonRequest(`http://localhost/api/projects/${target.id}/milestones`, 'POST', {
        title: 'Finalize external reviewer signoff',
        status: 'PLANNED',
      }),
      { params: Promise.resolve({ id: target.id }) },
    );
    expect(msCreate.status).toBe(201);
    const { milestone } = (await msCreate.json()) as { milestone: { id: string } };

    const msPatch = await patchMilestoneRoute(
      jsonRequest(`http://localhost/api/projects/${target.id}/milestones`, 'PATCH', {
        milestoneId: milestone.id,
        status: 'COMPLETED',
      }),
      { params: Promise.resolve({ id: target.id }) },
    );
    expect(msPatch.status).toBe(200);
    expect(
      ((await msPatch.json()) as { milestone: { completedAt: string | null } }).milestone
        .completedAt,
    ).not.toBeNull();

    const linkRes = await linkObjectRoute(
      jsonRequest(`http://localhost/api/projects/${target.id}/objects`, 'POST', {
        objectType: 'source',
        objectId: 'src-github-vllm',
      }),
      { params: Promise.resolve({ id: target.id }) },
    );
    expect(linkRes.status).toBe(201);

    const unlinkRes = await unlinkObjectRoute(
      new Request(
        `http://localhost/api/projects/${target.id}/objects?objectType=source&objectId=src-github-vllm`,
        { method: 'DELETE' },
      ),
      { params: Promise.resolve({ id: target.id }) },
    );
    expect(unlinkRes.status).toBe(200);

    const detailRes = await getProject(new Request(`http://localhost/api/projects/${target.slug}`), {
      params: Promise.resolve({ id: target.slug }),
    });
    expect(detailRes.status).toBe(200);

    const wsList = await getWorkspaces();
    expect(((await wsList.json()) as { total: number }).total).toBeGreaterThanOrEqual(1);
  });

  it('enforces §6 formal review anonymity redaction, linked rebuttals, and mandatory decision rationale', async () => {
    const createRes = await createReviewRoute(
      jsonRequest('http://localhost/api/reviews', 'POST', {
        contributionId: 'contrib-vllm-paged-review',
        scope: 'Serving throughput methodology',
        anonymous: true,
        initialItem: {
          itemType: 'suggestion',
          body: 'Clarify batch size distribution used in the PagedAttention memory table.',
        },
      }),
    );
    expect(createRes.status).toBe(201);
    const { review } = (await createRes.json()) as {
      review: {
        id: string;
        anonymous: boolean;
        reviewerHandle: string | null;
        reviewerName: string;
        items: Array<{ id: string; authorName: string }>;
      };
    };

    // §25.2 Strict anonymity redaction
    expect(review.anonymous).toBe(true);
    expect(review.reviewerHandle).toBeNull();
    expect(review.reviewerName).toBe('Anonymous reviewer');
    expect(review.items[0].authorName).toBe('Anonymous reviewer');

    // Append another review item and accept the first suggestion
    const addItemRes = await addReviewItemRoute(
      jsonRequest(`http://localhost/api/reviews/${review.id}/items`, 'POST', {
        itemType: 'review',
        body: 'Hardware clock speeds and CUDA version should be recorded for exact replication.',
        anonymous: false,
      }),
      { params: Promise.resolve({ id: review.id }) },
    );
    expect(addItemRes.status).toBe(201);
    // Inherits review anonymity when review is anonymous
    expect(((await addItemRes.json()) as { item: { authorName: string } }).item.authorName).toBe(
      'Anonymous reviewer',
    );

    const acceptRes = await patchReviewItemRoute(
      jsonRequest(`http://localhost/api/reviews/${review.id}/items`, 'PATCH', {
        itemId: review.items[0].id,
        status: 'accepted',
      }),
      { params: Promise.resolve({ id: review.id }) },
    );
    expect(acceptRes.status).toBe(200);
    expect(((await acceptRes.json()) as { item: { status: string } }).item.status).toBe('accepted');

    // Rebuttal with non-existent reviewItemId -> MUST fail with 400
    const badRebuttal = await addRebuttalRoute(
      jsonRequest(`http://localhost/api/reviews/${review.id}/rebuttals`, 'POST', {
        reviewItemIds: ['non-existent-item-id'],
        body: 'We updated the methodology table.',
      }),
      { params: Promise.resolve({ id: review.id }) },
    );
    expect(badRebuttal.status).toBe(400);

    // Valid linked rebuttal -> 201
    const goodRebuttal = await addRebuttalRoute(
      jsonRequest(`http://localhost/api/reviews/${review.id}/rebuttals`, 'POST', {
        reviewItemIds: [review.items[0].id],
        body: 'Added exact prompt length distribution and hardware spec table in Section 2.',
      }),
      { params: Promise.resolve({ id: review.id }) },
    );
    expect(goodRebuttal.status).toBe(201);

    // Decision with short rationale (<10 chars) -> 400
    const shortDecision = await recordDecisionRoute(
      jsonRequest(`http://localhost/api/reviews/${review.id}/decisions`, 'POST', {
        outcome: 'ACCEPT',
        rationale: 'Looks ok',
      }),
      { params: Promise.resolve({ id: review.id }) },
    );
    expect(shortDecision.status).toBe(400);

    // Valid decision -> 201 and review transitions to RESOLVED
    const validDecision = await recordDecisionRoute(
      jsonRequest(`http://localhost/api/reviews/${review.id}/decisions`, 'POST', {
        outcome: 'ACCEPT',
        rationale: 'All methodological questions and batch distribution details are verified.',
      }),
      { params: Promise.resolve({ id: review.id }) },
    );
    expect(validDecision.status).toBe(201);
    expect(((await validDecision.json()) as { review: { status: string } }).review.status).toBe(
      'RESOLVED',
    );

    const fetched = await getReviews(
      new Request('http://localhost/api/reviews?contributionId=contrib-vllm-paged-review'),
    );
    expect(((await fetched.json()) as { total: number }).total).toBe(1);
  });

  it('exposes the provenance graph via GET /api/relationships and allows human accept/reject of AI-proposed edges', async () => {
    // Create an AI-suggested CONTRADICTS edge -> starts PROPOSED
    const aiCreate = await createRelationship(
      jsonRequest('http://localhost/api/relationships', 'POST', {
        kind: 'claim-evidence',
        claimId: 'clm-paged-attention-utilization',
        evidenceId: 'ev-grpo-emergence',
        relationship: 'QUALIFIES',
        assertionMethod: 'AI_SUGGESTED',
        confidence: 0.55,
        rationale: 'AI proposed cross-domain interaction.',
      }),
    );
    expect(aiCreate.status).toBe(201);
    expect(
      ((await aiCreate.json()) as { relationship: { status: string } }).relationship.status,
    ).toBe('PROPOSED');

    // GET /api/relationships returns graph nodes, edges, and claimEvidence array
    const graphRes = await getRelationships(new Request('http://localhost/api/relationships'));
    expect(graphRes.status).toBe(200);
    const graphPayload = (await graphRes.json()) as {
      totalNodes: number;
      totalEdges: number;
      claimEvidence: Array<{ status: string }>;
    };
    expect(graphPayload.totalNodes).toBeGreaterThanOrEqual(6);
    expect(graphPayload.totalEdges).toBeGreaterThanOrEqual(4);
    expect(graphPayload.claimEvidence.some((l) => l.status === 'PROPOSED')).toBe(true);

    // Human curates the PROPOSED edge to ACCEPTED
    const curateRes = await curateRelationship(
      jsonRequest('http://localhost/api/relationships', 'PATCH', {
        claimId: 'clm-paged-attention-utilization',
        evidenceId: 'ev-grpo-emergence',
        relationship: 'QUALIFIES',
        status: 'ACCEPTED',
        rationale: 'Human reviewer confirmed reasoning rollout lengths qualify KV cache sizing.',
      }),
    );
    expect(curateRes.status).toBe(200);
    expect(
      ((await curateRes.json()) as { relationship: { status: string } }).relationship.status,
    ).toBe('ACCEPTED');
  });
});
