import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { resetV34StoreForTesting } from '@/lib/v34/store';
import { resetWave2StoreForTesting } from '@/lib/v34/wave2-store';
import { resetWave3StoreForTesting } from '@/lib/v34/wave3-store';

vi.mock('@/lib/supabase/config', () => ({
  isSupabaseConfigured: false,
}));

vi.mock('@/lib/cms/auth', () => ({
  getDashboardUser: vi.fn(async () => ({
    id: 'user-author-1',
    email: 'author@researchwithme.org',
    name: 'Dr. Researcher',
    isEditor: true,
    isAdmin: false,
  })),
}));

import { GET as listDiscussionsRoute, POST as createDiscussionRoute } from '@/app/api/discussions/route';
import {
  DELETE as deleteCommentRoute,
  PATCH as editCommentRoute,
  POST as addCommentRoute,
} from '@/app/api/discussions/[id]/comments/route';
import { POST as lockDiscussionRoute } from '@/app/api/discussions/[id]/lock/route';
import { GET as listToolsRoute, POST as registerToolRoute } from '@/app/api/tools/route';
import { POST as linkToolSourceRoute } from '@/app/api/tools/[id]/link-source/route';
import {
  GET as listProjectNotesRoute,
  PATCH as updateProjectNoteRoute,
  POST as createProjectNoteRoute,
} from '@/app/api/projects/[id]/notes/route';
import {
  GET as listNotificationsRoute,
  PATCH as markNotificationRoute,
} from '@/app/api/notifications/route';
import {
  GET as listAttentionRoute,
  PATCH as updateAttentionRoute,
} from '@/app/api/attention/route';
import {
  GET as listAssistantTasksRoute,
  POST as createAssistantTaskRoute,
} from '@/app/api/assistant-tasks/route';
import { POST as promoteAssistantTaskRoute } from '@/app/api/assistant-tasks/[id]/promote/route';
import {
  GET as getRecognitionRoute,
  PATCH as reverseRecognitionRoute,
  POST as recordRecognitionRoute,
} from '@/app/api/recognition/route';
import {
  GET as getPrefsRoute,
  PATCH as updatePrefsRoute,
} from '@/app/api/dashboard/preferences/route';

function makeRequest(url: string, init?: { method?: string; body?: unknown }): NextRequest {
  const headers = new Headers();
  let body: string | undefined;
  if (init?.body !== undefined) {
    headers.set('content-type', 'application/json');
    body = JSON.stringify(init.body);
  }
  return new NextRequest(url, { method: init?.method ?? 'GET', headers, body });
}

describe('v3.4 Wave 3 API routes & invariants', () => {
  beforeEach(() => {
    resetV34StoreForTesting();
    resetWave2StoreForTesting();
    resetWave3StoreForTesting();
  });

  it('§6 enforces informal discussion lifecycle and blocks comments when thread is locked (403 DISCUSSION_LOCKED)', async () => {
    const createRes = await createDiscussionRoute(
      makeRequest('http://localhost/api/discussions', {
        method: 'POST',
        body: {
          objectType: 'contribution',
          objectId: 'contrib-rl-cold-start',
          title: 'Does this checkpoint hold under INT8 quantization?',
          initialBody: 'Testing INT8 AWQ quantization on 7B checkpoints.',
        },
      }),
    );
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as {
      discussion: { id: string; comments: Array<{ id: string; body: string }> };
    };
    const discussionId = created.discussion.id;
    expect(created.discussion.comments).toHaveLength(1);

    // Add comment
    const commentRes = await addCommentRoute(
      makeRequest(`http://localhost/api/discussions/${discussionId}/comments`, {
        method: 'POST',
        body: { body: 'Yes, within 0.4% on GSM8K in our informal run.' },
      }),
      { params: Promise.resolve({ id: discussionId }) },
    );
    expect(commentRes.status).toBe(201);
    const added = (await commentRes.json()) as { comment: { id: string } };

    // Edit comment
    const editRes = await editCommentRoute(
      makeRequest(`http://localhost/api/discussions/${discussionId}/comments`, {
        method: 'PATCH',
        body: { commentId: added.comment.id, body: 'Yes, within 0.35% on GSM8K across 3 seeds.' },
      }),
      { params: Promise.resolve({ id: discussionId }) },
    );
    expect(editRes.status).toBe(200);
    const edited = (await editRes.json()) as { comment: { body: string; editedAt: string | null } };
    expect(edited.comment.body).toContain('0.35%');
    expect(edited.comment.editedAt).toBeTruthy();

    // Lock discussion
    const lockRes = await lockDiscussionRoute(
      makeRequest(`http://localhost/api/discussions/${discussionId}/lock`, {
        method: 'POST',
        body: { locked: true, reason: 'Moved formal critique into Peer Review.' },
      }),
      { params: Promise.resolve({ id: discussionId }) },
    );
    expect(lockRes.status).toBe(200);

    // Posting into locked discussion must return 403 DISCUSSION_LOCKED
    const blockedRes = await addCommentRoute(
      makeRequest(`http://localhost/api/discussions/${discussionId}/comments`, {
        method: 'POST',
        body: { body: 'Trying to post after lock.' },
      }),
      { params: Promise.resolve({ id: discussionId }) },
    );
    expect(blockedRes.status).toBe(403);
    const blockedBody = (await blockedRes.json()) as { code: string };
    expect(blockedBody.code).toBe('DISCUSSION_LOCKED');

    // Delete comment works cleanly
    const delRes = await deleteCommentRoute(
      makeRequest(
        `http://localhost/api/discussions/${discussionId}/comments?commentId=${added.comment.id}`,
        { method: 'DELETE' },
      ),
      { params: Promise.resolve({ id: discussionId }) },
    );
    expect(delRes.status).toBe(200);

    const listRes = await listDiscussionsRoute(
      makeRequest(
        'http://localhost/api/discussions?objectType=contribution&objectId=contrib-rl-cold-start',
      ),
    );
    expect(listRes.status).toBe(200);
    const listed = (await listRes.json()) as { discussions: Array<{ id: string }> };
    expect(listed.discussions.some((d) => d.id === discussionId)).toBe(true);
  });

  it('§8 deduplicates global ToolRepository records and links citable software Source snapshots via ToolSourceLink', async () => {
    const firstRes = await registerToolRoute(
      makeRequest('http://localhost/api/tools', {
        method: 'POST',
        body: {
          name: 'SGLang',
          provider: 'github',
          ownerName: 'sgl-project',
          repoName: 'sglang',
          repositoryUrl: 'https://github.com/sgl-project/sglang',
          summary: 'Structured generation runtime for large language models.',
          starsCount: 12000,
          latestReleaseTag: 'v0.4.0',
        },
      }),
    );
    expect(firstRes.status).toBe(201);
    const first = (await firstRes.json()) as { tool: { id: string }; created: boolean };
    expect(first.created).toBe(true);

    // Re-registering same repo with updated observation deduplicates rather than cloning
    const secondRes = await registerToolRoute(
      makeRequest('http://localhost/api/tools', {
        method: 'POST',
        body: {
          name: 'SGLang',
          provider: 'github',
          ownerName: 'sgl-project',
          repoName: 'sglang',
          repositoryUrl: 'https://github.com/sgl-project/sglang/',
          summary: 'Structured generation runtime for large language models.',
          starsCount: 14250,
          latestReleaseTag: 'v0.4.2',
        },
      }),
    );
    expect(secondRes.status).toBe(200);
    const second = (await secondRes.json()) as {
      tool: { id: string; starsCount: number; latestReleaseTag: string; observedAt: string };
      created: boolean;
    };
    expect(second.created).toBe(false);
    expect(second.tool.id).toBe(first.tool.id);
    expect(second.tool.starsCount).toBe(14250);
    expect(second.tool.observedAt).toBeTruthy();

    // Link canonical software Source snapshot
    const linkRes = await linkToolSourceRoute(
      makeRequest(`http://localhost/api/tools/${first.tool.id}/link-source`, {
        method: 'POST',
        body: {
          sourceId: 'src-github-vllm',
          releaseTag: 'v0.4.2',
        },
      }),
      { params: Promise.resolve({ id: first.tool.id }) },
    );
    expect(linkRes.status).toBe(201);

    const listRes = await listToolsRoute(makeRequest('http://localhost/api/tools?q=sglang'));
    expect(listRes.status).toBe(200);
    const listed = (await listRes.json()) as {
      tools: Array<{ id: string; linkedSources: Array<{ sourceId: string; releaseTag: string | null }> }>;
    };
    expect(listed.tools).toHaveLength(1);
    expect(listed.tools[0].linkedSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceId: 'src-github-vllm', releaseTag: 'v0.4.2' }),
      ]),
    );
  });

  it('§9 creates and versions private ProjectNote working notes separate from published Contributions', async () => {
    const projectId = 'proj-reasoning-audit';
    const createRes = await createProjectNoteRoute(
      makeRequest(`http://localhost/api/projects/${projectId}/notes`, {
        method: 'POST',
        body: {
          title: 'Ablation Seed Plan',
          bodyMarkdown: 'Run seeds 42, 43, 44 across 2x H100 nodes.',
          classification: 'workspace',
        },
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { note: { id: string; version: number } };
    expect(created.note.version).toBe(1);

    const patchRes = await updateProjectNoteRoute(
      makeRequest(`http://localhost/api/projects/${projectId}/notes`, {
        method: 'PATCH',
        body: {
          noteId: created.note.id,
          bodyMarkdown: 'Updated: seeds 42–46 completed with zero OOM.',
        },
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    expect(patchRes.status).toBe(200);
    const updated = (await patchRes.json()) as { note: { version: number; bodyMarkdown: string } };
    expect(updated.note.version).toBe(2);
    expect(updated.note.bodyMarkdown).toContain('zero OOM');

    const listRes = await listProjectNotesRoute(
      makeRequest(`http://localhost/api/projects/${projectId}/notes`),
      { params: Promise.resolve({ id: projectId }) },
    );
    expect(listRes.status).toBe(200);
    const listed = (await listRes.json()) as { notes: Array<{ id: string }> };
    expect(listed.notes.some((n) => n.id === created.note.id)).toBe(true);
  });

  it('§10 keeps Notifications, Attention Items, and Optional Assistant Tasks cleanly separated with explicit promotion', async () => {
    const initialAttentionRes = await listAttentionRoute(new Request('http://localhost/api/attention'));
    const initialAttention = (await initialAttentionRes.json()) as {
      items: Array<{ id: string; status: string }>;
    };
    const initialCount = initialAttention.items.length;

    // 1. Marking a notification read does NOT resolve or alter attention items
    const notifsRes = await listNotificationsRoute(new Request('http://localhost/api/notifications'));
    const notifs = (await notifsRes.json()) as { notifications: Array<{ id: string }> };
    const markReadRes = await markNotificationRoute(
      makeRequest('http://localhost/api/notifications', {
        method: 'PATCH',
        body: { id: notifs.notifications[0].id, read: true },
      }),
    );
    expect(markReadRes.status).toBe(200);

    const attentionAfterReadRes = await listAttentionRoute(new Request('http://localhost/api/attention'));
    const attentionAfterRead = (await attentionAfterReadRes.json()) as {
      items: Array<{ id: string; status: string }>;
    };
    expect(attentionAfterRead.items).toEqual(initialAttention.items);

    // 2. Creating an AssistantTask MUST NOT auto-create a mandatory AttentionItem
    const taskRes = await createAssistantTaskRoute(
      makeRequest('http://localhost/api/assistant-tasks', {
        method: 'POST',
        body: {
          taskType: 'suggest-citations',
          title: 'Verify DeepSeek-R1 Table 4 citation locator',
          explanation: 'Page number may differ between arXiv v1 and v2.',
        },
      }),
    );
    expect(taskRes.status).toBe(201);
    const createdTask = (await taskRes.json()) as {
      task: { id: string; promotedAttentionId: string | null };
    };
    expect(createdTask.task.promotedAttentionId).toBeNull();

    const attentionBeforePromoteRes = await listAttentionRoute(new Request('http://localhost/api/attention'));
    const attentionBeforePromote = (await attentionBeforePromoteRes.json()) as {
      items: Array<{ id: string }>;
    };
    expect(attentionBeforePromote.items).toHaveLength(initialCount);

    // 3. Explicit human promotion creates a linked AttentionItem of kind ASSISTANT
    const promoteRes = await promoteAssistantTaskRoute(
      makeRequest(`http://localhost/api/assistant-tasks/${createdTask.task.id}/promote`, {
        method: 'POST',
        body: { severity: 'WARNING' },
      }),
      { params: Promise.resolve({ id: createdTask.task.id }) },
    );
    expect(promoteRes.status).toBe(201);
    const promoted = (await promoteRes.json()) as {
      task: { status: string; promotedAttentionId: string };
      attentionItem: { id: string; kind: string; promotedBy: string; status: string };
    };
    expect(promoted.task.status).toBe('ACCEPTED');
    expect(promoted.attentionItem.kind).toBe('ASSISTANT');
    expect(promoted.attentionItem.promotedBy).toBe('local-contributor');
    expect(promoted.task.promotedAttentionId).toBe(promoted.attentionItem.id);

    // 4. Resolving the promoted AttentionItem marks status RESOLVED
    const resolveRes = await updateAttentionRoute(
      makeRequest('http://localhost/api/attention', {
        method: 'PATCH',
        body: { id: promoted.attentionItem.id, status: 'RESOLVED' },
      }),
    );
    expect(resolveRes.status).toBe(200);
    const resolved = (await resolveRes.json()) as {
      item: { status: string; updatedAt: string };
    };
    expect(resolved.item.status).toBe('RESOLVED');
    expect(resolved.item.updatedAt).toBeTruthy();

    const tasksListRes = await listAssistantTasksRoute();
    expect(tasksListRes.status).toBe(200);
  });

  it('§11 rejects self-recognition (400 SELF_RECOGNITION_FORBIDDEN), derives transparent event counts, supports reversal, and exposes no composite vanity score', async () => {
    // Self-recognition by userId must be rejected
    const selfRes = await recordRecognitionRoute(
      makeRequest('http://localhost/api/recognition', {
        method: 'POST',
        body: {
          recipientUserId: 'local-contributor',
          recipientHandle: 'someone-else',
          eventType: 'REVIEW_HELPFUL',
          objectType: 'review',
          objectId: 'rev-1',
        },
      }),
    );
    expect(selfRes.status).toBe(400);
    const selfBody = (await selfRes.json()) as { code: string };
    expect(selfBody.code).toBe('SELF_RECOGNITION_FORBIDDEN');

    // Self-recognition by handle must also be rejected
    const selfHandleRes = await recordRecognitionRoute(
      makeRequest('http://localhost/api/recognition', {
        method: 'POST',
        body: {
          recipientHandle: 'local-researcher',
          eventType: 'REVIEW_HELPFUL',
          objectType: 'review',
          objectId: 'rev-2',
        },
      }),
    );
    expect(selfHandleRes.status).toBe(400);
    expect(((await selfHandleRes.json()) as { code: string }).code).toBe(
      'SELF_RECOGNITION_FORBIDDEN',
    );

    // Valid non-self recognition event
    const validRes = await recordRecognitionRoute(
      makeRequest('http://localhost/api/recognition', {
        method: 'POST',
        body: {
          recipientUserId: 'user-other-researcher',
          recipientHandle: 'dr-lin',
          eventType: 'CORRECTION_ACCEPTED',
          objectType: 'contribution',
          objectId: 'contrib-rl-cold-start',
        },
      }),
    );
    expect(validRes.status).toBe(201);
    const valid = (await validRes.json()) as {
      event: { id: string };
      summary: Record<string, unknown>;
    };
    expect(valid.summary.acceptedCorrections).toBe(1);
    // Strict §11 no-vanity-score invariant
    expect(valid.summary).not.toHaveProperty('reputationScore');
    expect(valid.summary).not.toHaveProperty('trustScore');
    expect(valid.summary).not.toHaveProperty('qualityScore');
    expect(valid.summary).not.toHaveProperty('score');

    // Reversal removes event from derived counts
    const revRes = await reverseRecognitionRoute(
      makeRequest('http://localhost/api/recognition', {
        method: 'PATCH',
        body: {
          eventId: valid.event.id,
          reason: 'Duplicate event reported by moderation queue.',
        },
      }),
    );
    expect(revRes.status).toBe(200);

    const afterGetRes = await getRecognitionRoute(
      makeRequest('http://localhost/api/recognition?handle=dr-lin'),
    );
    expect(afterGetRes.status).toBe(200);
    const afterSummary = (await afterGetRes.json()) as {
      summary: { acceptedCorrections: number };
    };
    expect(afterSummary.summary.acceptedCorrections).toBe(0);
  });

  it('§13–§14 persists dashboard landing preference, digest frequency, and followed topics', async () => {
    const patchRes = await updatePrefsRoute(
      makeRequest('http://localhost/api/dashboard/preferences', {
        method: 'PATCH',
        body: {
          defaultLanding: 'PROJECTS',
          digestFrequency: 'daily',
          followTopic: { topicSlug: 'systems', topicLabel: 'Systems' },
        },
      }),
    );
    expect(patchRes.status).toBe(200);
    const patched = (await patchRes.json()) as {
      preferences: {
        defaultLanding: string;
        digestFrequency: string;
        followedTopics: Array<{ topicSlug: string }>;
      };
    };
    expect(patched.preferences.defaultLanding).toBe('PROJECTS');
    expect(patched.preferences.digestFrequency).toBe('daily');
    expect(patched.preferences.followedTopics.some((t) => t.topicSlug === 'systems')).toBe(true);

    const getRes = await getPrefsRoute();
    expect(getRes.status).toBe(200);
    const loaded = (await getRes.json()) as { preferences: { defaultLanding: string } };
    expect(loaded.preferences.defaultLanding).toBe('PROJECTS');
  });
});
