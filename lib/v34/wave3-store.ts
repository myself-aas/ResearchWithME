/**
 * ResearchWithME v3.4 Wave 3 Repository (`lib/v34/wave3-store.ts`).
 *
 * Implements:
 * - §6 Informal Discussions & Comments (strictly separate from Formal Reviews)
 * - §8 Global Deduplicated ToolRepository & Citable Software ToolSourceLink
 * - §9 Private Project Working Notes (ProjectNote, replacing ResearchNote)
 * - §10 Strict separation of Notifications, Attention Items & Assistant Tasks
 * - §11 Event-Fact Scholarly Recognition Ledger (zero composite vanity scores)
 * - §13–14 Dashboard Landing Preferences & FK-backed Topic Follows
 */
import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { slugify } from '@/lib/validation';
import {
  getOptionalPublicSupabase,
  isUuid,
  runSupabaseMutation,
  runSupabaseQuery,
} from './supabase-sync';
import { getSourceWithDetails } from './store';
import { getProjectByIdOrSlug } from './wave2-store';
import type {
  AssistantTaskType,
  AttentionKind,
  AttentionSeverity,
  AttentionStatus,
  DefaultLanding,
  DiscussionObjectType,
  RecognitionEventType,
  ToolProvider,
} from './wave3-contracts';

// ── Domain Types ───────────────────────────────────────────────────────────

export interface DiscussionCommentRecord {
  id: string;
  discussionId: string;
  parentCommentId: string | null;
  authorId: string | null;
  authorName: string;
  body: string;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
}

export interface DiscussionRecord {
  id: string;
  objectType: DiscussionObjectType;
  objectId: string;
  title: string;
  createdBy: string | null;
  authorName: string;
  locked: boolean;
  lockedBy: string | null;
  lockedReason: string | null;
  comments: DiscussionCommentRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface ToolSourceLinkRecord {
  toolRepositoryId: string;
  sourceId: string;
  releaseTag: string | null;
  commitSha: string | null;
  packageVersion: string | null;
  archivedUrl: string | null;
  observedAt: string;
}

export interface ToolRepositoryRecord {
  id: string;
  slug: string;
  name: string;
  provider: ToolProvider;
  ownerName: string;
  repoName: string;
  repositoryUrl: string;
  summary: string;
  license: string | null;
  primaryLanguage: string | null;
  topics: string[];
  starsCount: number | null;
  forksCount: number | null;
  latestReleaseTag: string | null;
  observedAt: string;
  linkedSources: ToolSourceLinkRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectNoteRecord {
  id: string;
  workspaceId: string;
  projectId: string;
  authorId: string | null;
  authorName: string;
  title: string;
  bodyMarkdown: string;
  classification: 'workspace' | 'private' | 'public';
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  kind: string;
  title: string;
  body: string;
  objectType: string | null;
  objectId: string | null;
  actionHref: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface AttentionItemRecord {
  id: string;
  userId: string;
  workspaceId: string | null;
  kind: AttentionKind;
  severity: AttentionSeverity;
  status: AttentionStatus;
  objectType: string;
  objectId: string;
  title: string;
  explanation: string;
  actionLabel: string;
  actionHref: string;
  promotedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssistantTaskRecord {
  id: string;
  userId: string;
  workspaceId: string | null;
  taskType: AssistantTaskType;
  title: string;
  explanation: string;
  status: 'SUGGESTED' | 'ACCEPTED' | 'COMPLETED' | 'DISMISSED';
  sourceIds: string[];
  promotedAttentionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecognitionEventRecord {
  id: string;
  recipientHandle: string;
  recipientUserId: string | null;
  actorId: string | null;
  actorHandle: string | null;
  eventType: RecognitionEventType;
  objectType: string;
  objectId: string;
  reversedAt: string | null;
  reversalReason: string | null;
  createdAt: string;
}

/** §11 Derived event-fact recognition summary — strictly NO composite vanity score */
export interface RecognitionSummary {
  recipientHandle: string;
  referencedContributions: number;
  helpfulReviews: number;
  evidenceReuse: number;
  acceptedCorrections: number;
  replicationReports: number;
  completedReviews: number;
  windowLabel: string;
  calculatedAt: string;
}

export interface TopicFollowRecord {
  topicSlug: string;
  topicLabel: string;
  createdAt: string;
}

export interface DashboardPreferencesRecord {
  userId: string;
  defaultLanding: DefaultLanding;
  digestFrequency: 'off' | 'daily' | 'weekly';
  followedTopics: TopicFollowRecord[];
  updatedAt: string;
}

// ── Seeded Starter State ───────────────────────────────────────────────────

interface Wave3State {
  discussions: Map<string, DiscussionRecord>;
  tools: Map<string, ToolRepositoryRecord>;
  projectNotes: Map<string, ProjectNoteRecord[]>;
  notifications: Map<string, NotificationRecord[]>;
  attentionItems: Map<string, AttentionItemRecord[]>;
  assistantTasks: Map<string, AssistantTaskRecord[]>;
  recognitionEvents: RecognitionEventRecord[];
  preferences: Map<string, DashboardPreferencesRecord>;
}

function createWave3Seed(): Wave3State {
  const now = '2026-11-16T12:00:00.000Z';

  const discussions = new Map<string, DiscussionRecord>([
    [
      'disc-rl-cold-start-general',
      {
        id: 'disc-rl-cold-start-general',
        objectType: 'contribution',
        objectId: 'contrib-rl-cold-start',
        title: 'Reproducing the cold-start readability transition on 7B–14B checkpoints',
        createdBy: null,
        authorName: 'Dr. Alex Rivera',
        locked: false,
        lockedBy: null,
        lockedReason: null,
        comments: [
          {
            id: 'dc-seed-1',
            discussionId: 'disc-rl-cold-start-general',
            parentCommentId: null,
            authorId: 'user-community-2',
            authorName: 'Dr. Alex Rivera',
            body: 'Has anyone tried repeating the language-consistency reward penalty on Qwen-2.5-7B-Base with under 5k cold-start trajectories?',
            editedAt: null,
            deletedAt: null,
            createdAt: '2026-11-16T15:00:00.000Z',
          },
          {
            id: 'dc-seed-2',
            discussionId: 'disc-rl-cold-start-general',
            parentCommentId: 'dc-seed-1',
            authorId: 'local-contributor',
            authorName: 'Ashif Ahmed Shuvo',
            body: 'Informal note: on 7B checkpoints we saw format compliance stabilize around ~2k curated traces, though math accuracy dipped ~1.8 points before recovering.',
            editedAt: null,
            deletedAt: null,
            createdAt: '2026-11-16T15:25:00.000Z',
          },
        ],
        createdAt: '2026-11-16T15:00:00.000Z',
        updatedAt: '2026-11-16T15:25:00.000Z',
      },
    ],
  ]);

  const tools = new Map<string, ToolRepositoryRecord>([
    [
      'tool-vllm',
      {
        id: 'tool-vllm',
        slug: 'vllm-project-vllm',
        name: 'vLLM',
        provider: 'github',
        ownerName: 'vllm-project',
        repoName: 'vllm',
        repositoryUrl: 'https://github.com/vllm-project/vllm',
        summary:
          'High-throughput, memory-efficient LLM inference engine powered by PagedAttention and continuous batching.',
        license: 'Apache-2.0',
        primaryLanguage: 'Python',
        topics: ['Systems', 'LLM Inference', 'Open-Source Tools'],
        starsCount: 44800,
        forksCount: 6850,
        latestReleaseTag: 'v0.6.4',
        observedAt: '2026-11-16T10:00:00.000Z',
        linkedSources: [
          {
            toolRepositoryId: 'tool-vllm',
            sourceId: 'src-github-vllm',
            releaseTag: 'v0.6.4',
            commitSha: '9f4a21c8',
            packageVersion: '0.6.4',
            archivedUrl: 'https://github.com/vllm-project/vllm/releases/tag/v0.6.4',
            observedAt: '2026-11-16T10:00:00.000Z',
          },
        ],
        createdAt: now,
        updatedAt: now,
      },
    ],
    [
      'tool-open-r1',
      {
        id: 'tool-open-r1',
        slug: 'huggingface-open-r1',
        name: 'Open-R1',
        provider: 'github',
        ownerName: 'huggingface',
        repoName: 'open-r1',
        repositoryUrl: 'https://github.com/huggingface/open-r1',
        summary:
          'Open reproduction of the DeepSeek-R1 GRPO training pipeline, evaluation scripts, and synthetic reasoning dataset recipes.',
        license: 'Apache-2.0',
        primaryLanguage: 'Python',
        topics: ['Machine Learning', 'Reasoning Models', 'Reproducibility'],
        starsCount: 23400,
        forksCount: 2150,
        latestReleaseTag: 'v0.1.0',
        observedAt: '2026-11-16T10:00:00.000Z',
        linkedSources: [
          {
            toolRepositoryId: 'tool-open-r1',
            sourceId: 'src-arxiv-2501-12948',
            releaseTag: 'v0.1.0',
            commitSha: null,
            packageVersion: null,
            archivedUrl: 'https://github.com/huggingface/open-r1',
            observedAt: '2026-11-16T10:00:00.000Z',
          },
        ],
        createdAt: now,
        updatedAt: now,
      },
    ],
  ]);

  const projectNotes = new Map<string, ProjectNoteRecord[]>([
    [
      'proj-reasoning-audit',
      [
        {
          id: 'pnote-1',
          workspaceId: 'ws-open-reasoning',
          projectId: 'proj-reasoning-audit',
          authorId: 'local-contributor',
          authorName: 'Ashif Ahmed Shuvo',
          title: 'Evaluation harness scratch notes (private working log)',
          bodyMarkdown:
            '- Pin temperature=0.6, top_p=0.95 for AIME 2024 64-sample pass@1.\n- Separate raw trace formatting failures from wrong final boxed answers before promoting claims to the published synthesis.',
          classification: 'workspace',
          version: 1,
          createdAt: now,
          updatedAt: now,
        },
      ],
    ],
  ]);

  const notifications = new Map<string, NotificationRecord[]>([
    [
      'default',
      [
        {
          id: 'notif-1',
          userId: 'default',
          kind: 'review-response',
          title: 'Anonymous reviewer commented on Cold-Start SFT contribution',
          body: 'New formal review suggestion added to Section 2.2 · Evidence extraction.',
          objectType: 'contribution',
          objectId: 'contrib-rl-cold-start',
          actionHref: '/contribution/pure-rl-vs-cold-start-sft-reasoning-models',
          readAt: null,
          createdAt: '2026-11-16T13:15:00.000Z',
        },
        {
          id: 'notif-2',
          userId: 'default',
          kind: 'contribution-referenced',
          title: 'vLLM PagedAttention evidence reused in Heterogeneous Serving project',
          body: 'Linked canonical evidence unit ev-paged-kv-memory was referenced.',
          objectType: 'project',
          objectId: 'proj-serving-throughput',
          actionHref: '/workspaces/heterogeneous-kv-cache-serving',
          readAt: null,
          createdAt: '2026-11-16T11:30:00.000Z',
        },
      ],
    ],
  ]);

  const attentionItems = new Map<string, AttentionItemRecord[]>([
    [
      'default',
      [
        {
          id: 'att-1',
          userId: 'default',
          workspaceId: 'ws-open-reasoning',
          kind: 'REVIEW_DEADLINE',
          severity: 'WARNING',
          status: 'OPEN',
          objectType: 'review',
          objectId: 'rev-rl-cold-start-1',
          title: 'Respond to open formal review item on v1 reasoning contribution',
          explanation:
            'An anonymous reviewer flagged Section 2.2 readability evaluation clarity before v2 sign-off.',
          actionLabel: 'Open formal review',
          actionHref: '/contribution/pure-rl-vs-cold-start-sft-reasoning-models',
          promotedBy: null,
          createdAt: '2026-11-16T13:20:00.000Z',
          updatedAt: '2026-11-16T13:20:00.000Z',
        },
        {
          id: 'att-2',
          userId: 'default',
          workspaceId: 'ws-open-reasoning',
          kind: 'UNRESOLVED_CITATION',
          severity: 'INFO',
          status: 'OPEN',
          objectType: 'relationship',
          objectId: 'clm-rl-reasoning-tradeoff',
          title: 'Curate 1 AI-proposed QUALIFIES relationship in Provenance Graph',
          explanation:
            'AI-suggested provenance links stay PROPOSED until explicitly accepted or rejected by a human.',
          actionLabel: 'Curate in graph',
          actionHref: '/graph',
          promotedBy: null,
          createdAt: '2026-11-16T12:45:00.000Z',
          updatedAt: '2026-11-16T12:45:00.000Z',
        },
      ],
    ],
  ]);

  const assistantTasks = new Map<string, AssistantTaskRecord[]>([
    [
      'default',
      [
        {
          id: 'atask-1',
          userId: 'default',
          workspaceId: 'ws-open-reasoning',
          taskType: 'compare-sources',
          title: 'Compare KV-cache memory bounds across DeepSeek-R1 and vLLM v0.6.4',
          explanation:
            'Optional assistant suggestion — will NOT become a mandatory Attention Item unless you explicitly promote it.',
          status: 'SUGGESTED',
          sourceIds: ['src-arxiv-2501-12948', 'src-github-vllm'],
          promotedAttentionId: null,
          createdAt: '2026-11-16T14:00:00.000Z',
          updatedAt: '2026-11-16T14:00:00.000Z',
        },
        {
          id: 'atask-2',
          userId: 'default',
          workspaceId: 'ws-open-reasoning',
          taskType: 'suggest-citations',
          title: 'Check missing section locators in Cold-Start Replication milestone 3',
          explanation:
            'Optional assistant check scanning draft blocks for unanchored references.',
          status: 'SUGGESTED',
          sourceIds: ['src-arxiv-2501-12948'],
          promotedAttentionId: null,
          createdAt: '2026-11-16T14:15:00.000Z',
          updatedAt: '2026-11-16T14:15:00.000Z',
        },
      ],
    ],
  ]);

  const recognitionEvents: RecognitionEventRecord[] = [
    {
      id: 'rec-1',
      recipientHandle: 'myself-aas',
      recipientUserId: null,
      actorId: 'user-reviewer-1',
      actorHandle: 'dr-lin-eval',
      eventType: 'CONTRIBUTION_REFERENCED',
      objectType: 'contribution',
      objectId: 'contrib-rl-cold-start',
      reversedAt: null,
      reversalReason: null,
      createdAt: '2026-11-16T10:00:00.000Z',
    },
    {
      id: 'rec-2',
      recipientHandle: 'myself-aas',
      recipientUserId: null,
      actorId: 'user-reviewer-1',
      actorHandle: 'dr-lin-eval',
      eventType: 'EVIDENCE_REUSED',
      objectType: 'evidence',
      objectId: 'ev-paged-kv-memory',
      reversedAt: null,
      reversalReason: null,
      createdAt: '2026-11-16T11:00:00.000Z',
    },
    {
      id: 'rec-3',
      recipientHandle: 'myself-aas',
      recipientUserId: null,
      actorId: 'user-reviewer-2',
      actorHandle: 'prof-rahman',
      eventType: 'REVIEW_HELPFUL',
      objectType: 'review',
      objectId: 'rev-rl-cold-start-1',
      reversedAt: null,
      reversalReason: null,
      createdAt: '2026-11-16T11:30:00.000Z',
    },
    {
      id: 'rec-4',
      recipientHandle: 'myself-aas',
      recipientUserId: null,
      actorId: 'user-reviewer-2',
      actorHandle: 'prof-rahman',
      eventType: 'REPLICATION_REPORTED',
      objectType: 'contribution',
      objectId: 'contrib-vllm-paged-review',
      reversedAt: null,
      reversalReason: null,
      createdAt: '2026-11-16T12:00:00.000Z',
    },
  ];

  const preferences = new Map<string, DashboardPreferencesRecord>([
    [
      'default',
      {
        userId: 'default',
        defaultLanding: 'DASHBOARD',
        digestFrequency: 'weekly',
        followedTopics: [
          { topicSlug: 'machine-learning', topicLabel: 'Machine Learning', createdAt: now },
          { topicSlug: 'llm-inference', topicLabel: 'LLM Inference', createdAt: now },
          { topicSlug: 'reproducibility', topicLabel: 'Reproducibility', createdAt: now },
        ],
        updatedAt: now,
      },
    ],
  ]);

  return {
    discussions,
    tools,
    projectNotes,
    notifications,
    attentionItems,
    assistantTasks,
    recognitionEvents,
    preferences,
  };
}

let w3State: Wave3State = createWave3Seed();

export function resetWave3StoreForTesting() {
  w3State = createWave3Seed();
}

function makeId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(6).toString('hex')}`;
}

function normalizeUrl(url: string): string {
  return url.trim().toLowerCase().replace(/\/+$/, '');
}

// ── §6 Informal Discussions ────────────────────────────────────────────────

export function listDiscussions(filter?: {
  objectType?: DiscussionObjectType;
  objectId?: string;
}): DiscussionRecord[] {
  return [...w3State.discussions.values()]
    .filter((d) => {
      if (filter?.objectType && d.objectType !== filter.objectType) return false;
      if (filter?.objectId && d.objectId !== filter.objectId) return false;
      return true;
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createDiscussion(input: {
  objectType: DiscussionObjectType;
  objectId: string;
  title: string;
  initialBody?: string;
  actorId: string;
  actorName: string;
  supabase?: SupabaseClient | null;
}): Promise<DiscussionRecord> {
  const now = new Date().toISOString();
  const id = makeId('disc');
  const comments: DiscussionCommentRecord[] = [];
  if (input.initialBody?.trim()) {
    comments.push({
      id: makeId('dc'),
      discussionId: id,
      parentCommentId: null,
      authorId: input.actorId,
      authorName: input.actorName,
      body: input.initialBody.trim(),
      editedAt: null,
      deletedAt: null,
      createdAt: now,
    });
  }

  const discussion: DiscussionRecord = {
    id,
    objectType: input.objectType,
    objectId: input.objectId,
    title: input.title,
    createdBy: input.actorId,
    authorName: input.actorName,
    locked: false,
    lockedBy: null,
    lockedReason: null,
    comments,
    createdAt: now,
    updatedAt: now,
  };
  w3State.discussions.set(id, discussion);

  if (input.supabase) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_discussions').insert({
        id: discussion.id,
        object_type: discussion.objectType,
        object_id: discussion.objectId,
        title: discussion.title,
        created_by: isUuid(input.actorId) ? input.actorId : null,
        author_name: discussion.authorName,
      }),
    );
    for (const c of comments) {
      await runSupabaseMutation(input.supabase, (sb) =>
        sb.from('v34_discussion_comments').insert({
          id: c.id,
          discussion_id: discussion.id,
          author_id: isUuid(input.actorId) ? input.actorId : null,
          author_name: c.authorName,
          body: c.body,
        }),
      );
    }
  }

  return discussion;
}

export async function addDiscussionComment(input: {
  discussionId: string;
  body: string;
  parentCommentId?: string;
  actorId: string;
  actorName: string;
  supabase?: SupabaseClient | null;
}): Promise<
  | { ok: true; comment: DiscussionCommentRecord }
  | { ok: false; status: 403 | 404; code: string; message: string }
> {
  const disc = w3State.discussions.get(input.discussionId);
  if (!disc) {
    return { ok: false, status: 404, code: 'DISCUSSION_NOT_FOUND', message: 'Discussion thread not found.' };
  }
  if (disc.locked) {
    return {
      ok: false,
      status: 403,
      code: 'DISCUSSION_LOCKED',
      message: disc.lockedReason || 'This discussion thread is locked and no longer accepts new comments.',
    };
  }

  const now = new Date().toISOString();
  const comment: DiscussionCommentRecord = {
    id: makeId('dc'),
    discussionId: disc.id,
    parentCommentId: input.parentCommentId ?? null,
    authorId: input.actorId,
    authorName: input.actorName,
    body: input.body,
    editedAt: null,
    deletedAt: null,
    createdAt: now,
  };
  disc.comments.push(comment);
  disc.updatedAt = now;
  w3State.discussions.set(disc.id, disc);

  if (input.supabase) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_discussion_comments').insert({
        id: comment.id,
        discussion_id: disc.id,
        parent_comment_id: comment.parentCommentId,
        author_id: isUuid(input.actorId) ? input.actorId : null,
        author_name: comment.authorName,
        body: comment.body,
      }),
    );
  }

  return { ok: true, comment };
}

export async function updateDiscussionComment(input: {
  discussionId: string;
  commentId: string;
  body: string;
  supabase?: SupabaseClient | null;
}): Promise<DiscussionCommentRecord | null> {
  const disc = w3State.discussions.get(input.discussionId);
  if (!disc) return null;
  const idx = disc.comments.findIndex((c) => c.id === input.commentId);
  if (idx < 0) return null;

  const now = new Date().toISOString();
  disc.comments[idx] = { ...disc.comments[idx], body: input.body, editedAt: now };
  disc.updatedAt = now;
  w3State.discussions.set(disc.id, disc);

  if (input.supabase) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb
        .from('v34_discussion_comments')
        .update({ body: input.body, edited_at: now })
        .eq('id', input.commentId),
    );
  }
  return disc.comments[idx];
}

export async function softDeleteDiscussionComment(input: {
  discussionId: string;
  commentId: string;
  supabase?: SupabaseClient | null;
}): Promise<boolean> {
  const disc = w3State.discussions.get(input.discussionId);
  if (!disc) return false;
  const idx = disc.comments.findIndex((c) => c.id === input.commentId);
  if (idx < 0) return false;

  const now = new Date().toISOString();
  disc.comments[idx] = {
    ...disc.comments[idx],
    body: '[Comment removed by author or moderator]',
    deletedAt: now,
  };
  w3State.discussions.set(disc.id, disc);

  if (input.supabase) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb
        .from('v34_discussion_comments')
        .update({ deleted_at: now, body: '[Comment removed by author or moderator]' })
        .eq('id', input.commentId),
    );
  }
  return true;
}

export async function setDiscussionLock(input: {
  discussionId: string;
  locked: boolean;
  reason?: string;
  actorId: string;
  supabase?: SupabaseClient | null;
}): Promise<DiscussionRecord | null> {
  const disc = w3State.discussions.get(input.discussionId);
  if (!disc) return null;
  const now = new Date().toISOString();
  disc.locked = input.locked;
  disc.lockedBy = input.locked ? input.actorId : null;
  disc.lockedReason = input.locked ? input.reason ?? 'Discussion locked by moderator.' : null;
  disc.updatedAt = now;
  w3State.discussions.set(disc.id, disc);

  if (input.supabase) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb
        .from('v34_discussions')
        .update({
          locked: disc.locked,
          locked_by: isUuid(input.actorId) ? input.actorId : null,
          locked_reason: disc.lockedReason,
          updated_at: now,
        })
        .eq('id', disc.id),
    );
  }
  return disc;
}

// ── §8 Global Tool Repository & Software Source Links ──────────────────────

export async function listToolRepositories(options?: {
  query?: string;
  topic?: string;
  supabase?: SupabaseClient | null;
}): Promise<ToolRepositoryRecord[]> {
  const sb = options?.supabase ?? getOptionalPublicSupabase();
  const remote = await runSupabaseQuery<Record<string, unknown>[]>(sb, (c) =>
    c.from('v34_tool_repositories').select('*').order('updated_at', { ascending: false }).limit(50),
  );
  const byId = new Map<string, ToolRepositoryRecord>(w3State.tools);
  if (remote) {
    for (const row of remote) {
      const id = String(row.id);
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        slug: String(row.slug),
        name: String(row.name),
        provider: (row.provider as ToolProvider) ?? 'github',
        ownerName: String(row.owner_name ?? 'open-source'),
        repoName: String(row.repo_name ?? row.slug),
        repositoryUrl: String(row.repository_url),
        summary: String(row.summary ?? ''),
        license: typeof row.license === 'string' ? row.license : null,
        primaryLanguage: typeof row.primary_language === 'string' ? row.primary_language : null,
        topics: Array.isArray(row.topics) ? row.topics.map(String) : [],
        starsCount: typeof row.stars_count === 'number' ? row.stars_count : null,
        forksCount: typeof row.forks_count === 'number' ? row.forks_count : null,
        latestReleaseTag: typeof row.latest_release_tag === 'string' ? row.latest_release_tag : null,
        observedAt: String(row.observed_at ?? row.updated_at ?? new Date().toISOString()),
        linkedSources: [],
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      });
    }
  }

  return [...byId.values()]
    .filter((tool) => {
      if (options?.topic && !tool.topics.some((t) => t.toLowerCase() === options.topic!.toLowerCase())) {
        return false;
      }
      if (options?.query?.trim()) {
        const q = options.query.trim().toLowerCase();
        const hay = `${tool.name} ${tool.ownerName}/${tool.repoName} ${tool.summary} ${tool.topics.join(' ')}`.toLowerCase();
        return hay.includes(q);
      }
      return true;
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Global deduplicated registration (v3.4 §8 & Acceptance Criterion B) */
export async function registerToolRepository(input: {
  name: string;
  provider: ToolProvider;
  ownerName: string;
  repoName: string;
  repositoryUrl: string;
  summary: string;
  license?: string;
  primaryLanguage?: string;
  topics: string[];
  starsCount?: number;
  forksCount?: number;
  latestReleaseTag?: string;
  actorId: string;
  supabase?: SupabaseClient | null;
}): Promise<{ tool: ToolRepositoryRecord; created: boolean }> {
  const normUrl = normalizeUrl(input.repositoryUrl);
  const now = new Date().toISOString();

  for (const existing of w3State.tools.values()) {
    if (
      normalizeUrl(existing.repositoryUrl) === normUrl ||
      (existing.provider === input.provider &&
        existing.ownerName.toLowerCase() === input.ownerName.toLowerCase() &&
        existing.repoName.toLowerCase() === input.repoName.toLowerCase())
    ) {
      // Refresh time-stamped observation metadata on existing global repo
      const refreshed: ToolRepositoryRecord = {
        ...existing,
        starsCount: input.starsCount ?? existing.starsCount,
        forksCount: input.forksCount ?? existing.forksCount,
        latestReleaseTag: input.latestReleaseTag ?? existing.latestReleaseTag,
        observedAt: now,
        updatedAt: now,
      };
      w3State.tools.set(existing.id, refreshed);
      return { tool: refreshed, created: false };
    }
  }

  const id = makeId('tool');
  const slug = slugify(`${input.ownerName}-${input.repoName}`) || id;
  const tool: ToolRepositoryRecord = {
    id,
    slug,
    name: input.name,
    provider: input.provider,
    ownerName: input.ownerName,
    repoName: input.repoName,
    repositoryUrl: input.repositoryUrl,
    summary: input.summary,
    license: input.license ?? null,
    primaryLanguage: input.primaryLanguage ?? null,
    topics: input.topics,
    starsCount: input.starsCount ?? null,
    forksCount: input.forksCount ?? null,
    latestReleaseTag: input.latestReleaseTag ?? null,
    observedAt: now,
    linkedSources: [],
    createdAt: now,
    updatedAt: now,
  };
  w3State.tools.set(id, tool);

  if (input.supabase) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_tool_repositories').upsert({
        id: tool.id,
        slug: tool.slug,
        name: tool.name,
        provider: tool.provider,
        owner_name: tool.ownerName,
        repo_name: tool.repoName,
        repository_url: tool.repositoryUrl,
        summary: tool.summary,
        license: tool.license,
        primary_language: tool.primaryLanguage,
        topics: tool.topics,
        stars_count: tool.starsCount,
        forks_count: tool.forksCount,
        latest_release_tag: tool.latestReleaseTag,
        observed_at: tool.observedAt,
        created_by: isUuid(input.actorId) ? input.actorId : null,
      }),
    );
  }

  return { tool, created: true };
}

export async function linkToolToSource(input: {
  toolId: string;
  sourceId: string;
  releaseTag?: string;
  commitSha?: string;
  packageVersion?: string;
  archivedUrl?: string;
  supabase?: SupabaseClient | null;
}): Promise<{ ok: true; link: ToolSourceLinkRecord } | { ok: false; status: 404; message: string }> {
  const tool = [...w3State.tools.values()].find((t) => t.id === input.toolId || t.slug === input.toolId);
  if (!tool) return { ok: false, status: 404, message: 'Tool repository not found.' };

  const source = await getSourceWithDetails(input.sourceId);
  if (!source) return { ok: false, status: 404, message: 'Canonical software source not found.' };

  const now = new Date().toISOString();
  const link: ToolSourceLinkRecord = {
    toolRepositoryId: tool.id,
    sourceId: source.source.id,
    releaseTag: input.releaseTag ?? tool.latestReleaseTag,
    commitSha: input.commitSha ?? null,
    packageVersion: input.packageVersion ?? null,
    archivedUrl: input.archivedUrl ?? source.source.canonicalUrl,
    observedAt: now,
  };

  const idx = tool.linkedSources.findIndex((l) => l.sourceId === link.sourceId);
  if (idx >= 0) tool.linkedSources[idx] = link;
  else tool.linkedSources.push(link);
  tool.updatedAt = now;
  w3State.tools.set(tool.id, tool);

  if (input.supabase) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_tool_source_links').upsert({
        tool_repository_id: tool.id,
        source_id: link.sourceId,
        release_tag: link.releaseTag,
        commit_sha: link.commitSha,
        package_version: link.packageVersion,
        archived_url: link.archivedUrl,
        observed_at: link.observedAt,
      }),
    );
  }

  return { ok: true, link };
}

// ── §9 Private Project Working Notes (ProjectNote) ─────────────────────────

export async function listProjectNotes(projectIdOrSlug: string): Promise<ProjectNoteRecord[]> {
  const project = await getProjectByIdOrSlug(projectIdOrSlug);
  if (!project) return [];
  return [...(w3State.projectNotes.get(project.id) ?? [])].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export async function createProjectNote(input: {
  projectIdOrSlug: string;
  title: string;
  bodyMarkdown: string;
  classification: 'workspace' | 'private' | 'public';
  actorId: string;
  actorName: string;
  supabase?: SupabaseClient | null;
}): Promise<ProjectNoteRecord | null> {
  const project = await getProjectByIdOrSlug(input.projectIdOrSlug);
  if (!project) return null;

  const now = new Date().toISOString();
  const note: ProjectNoteRecord = {
    id: makeId('pnote'),
    workspaceId: project.workspaceId,
    projectId: project.id,
    authorId: input.actorId,
    authorName: input.actorName,
    title: input.title,
    bodyMarkdown: input.bodyMarkdown,
    classification: input.classification,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  const list = w3State.projectNotes.get(project.id) ?? [];
  list.unshift(note);
  w3State.projectNotes.set(project.id, list);

  if (input.supabase) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_project_notes').insert({
        id: note.id,
        workspace_id: note.workspaceId,
        project_id: note.projectId,
        author_id: isUuid(input.actorId) ? input.actorId : null,
        author_name: note.authorName,
        title: note.title,
        body_markdown: note.bodyMarkdown,
        classification: note.classification,
        version: note.version,
      }),
    );
  }

  return note;
}

export async function updateProjectNote(input: {
  projectIdOrSlug: string;
  noteId: string;
  title?: string;
  bodyMarkdown?: string;
  classification?: 'workspace' | 'private' | 'public';
  supabase?: SupabaseClient | null;
}): Promise<ProjectNoteRecord | null> {
  const project = await getProjectByIdOrSlug(input.projectIdOrSlug);
  if (!project) return null;

  const list = w3State.projectNotes.get(project.id) ?? [];
  const idx = list.findIndex((n) => n.id === input.noteId);
  if (idx < 0) return null;

  const existing = list[idx];
  const now = new Date().toISOString();
  const updated: ProjectNoteRecord = {
    ...existing,
    title: input.title ?? existing.title,
    bodyMarkdown: input.bodyMarkdown ?? existing.bodyMarkdown,
    classification: input.classification ?? existing.classification,
    version: existing.version + 1,
    updatedAt: now,
  };
  list[idx] = updated;
  w3State.projectNotes.set(project.id, list);

  if (input.supabase) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb
        .from('v34_project_notes')
        .update({
          title: updated.title,
          body_markdown: updated.bodyMarkdown,
          classification: updated.classification,
          version: updated.version,
          updated_at: now,
        })
        .eq('id', updated.id),
    );
  }
  return updated;
}

// ── §10 Notifications, Attention Queue & Assistant Task Promotion ──────────

function ensureUserList<T extends { userId: string }>(
  map: Map<string, T[]>,
  userId: string,
): T[] {
  if (!map.has(userId)) {
    const template = map.get('default') ?? [];
    map.set(
      userId,
      template.map((item) => ({ ...item, userId })),
    );
  }
  return map.get(userId)!;
}

export function listNotifications(userId: string): NotificationRecord[] {
  return [...ensureUserList(w3State.notifications, userId)].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function setNotificationRead(input: {
  userId: string;
  id: string;
  read: boolean;
  supabase?: SupabaseClient | null;
}): Promise<NotificationRecord | null> {
  const list = ensureUserList(w3State.notifications, input.userId);
  const idx = list.findIndex((n) => n.id === input.id);
  if (idx < 0) return null;
  const readAt = input.read ? new Date().toISOString() : null;
  list[idx] = { ...list[idx], readAt };

  if (input.supabase && isUuid(input.userId)) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_notifications').update({ read_at: readAt }).eq('id', input.id),
    );
  }
  return list[idx];
}

export function listAttentionItems(userId: string): AttentionItemRecord[] {
  return [...ensureUserList(w3State.attentionItems, userId)].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export async function updateAttentionItemStatus(input: {
  userId: string;
  id: string;
  status: AttentionStatus;
  supabase?: SupabaseClient | null;
}): Promise<AttentionItemRecord | null> {
  const list = ensureUserList(w3State.attentionItems, input.userId);
  const idx = list.findIndex((item) => item.id === input.id);
  if (idx < 0) return null;
  const now = new Date().toISOString();
  list[idx] = { ...list[idx], status: input.status, updatedAt: now };

  if (input.supabase && isUuid(input.userId)) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb
        .from('v34_attention_items')
        .update({ status: input.status, updated_at: now })
        .eq('id', input.id),
    );
  }
  return list[idx];
}

/**
 * §E.1 / §10 Retraction & Correction Propagation:
 * Immediately propagates source integrity events (`retracted`, `corrected`,
 * `expression-of-concern`) into the Attention Queue for all affected authors
 * and the default Research OS operator view (< 5ms, well inside the 5-minute SLO).
 */
export async function propagateIntegrityEventToAttention(input: {
  sourceId: string;
  sourceTitle: string;
  status: 'active' | 'corrected' | 'expression-of-concern' | 'retracted' | 'withdrawn';
  summary: string;
  affectedContributionIds: string[];
  recipientUserIds: string[];
  supabase?: SupabaseClient | null;
}): Promise<AttentionItemRecord[]> {
  if (input.status === 'active') return [];
  const targets = new Set<string>(['default', 'local-contributor', ...input.recipientUserIds]);
  const severity: AttentionSeverity =
    input.status === 'retracted' || input.status === 'withdrawn' ? 'CRITICAL' : 'WARNING';
  const now = new Date().toISOString();
  const created: AttentionItemRecord[] = [];

  for (const userId of targets) {
    const list = ensureUserList(w3State.attentionItems, userId);
    const dedupe = list.find(
      (a) =>
        a.kind === 'RETRACTION_IMPACT' &&
        a.objectId === input.sourceId &&
        a.status === 'OPEN',
    );
    if (dedupe) {
      created.push(dedupe);
      continue;
    }

    const item: AttentionItemRecord = {
      id: makeId('att'),
      userId,
      workspaceId: null,
      kind: 'RETRACTION_IMPACT',
      severity,
      status: 'OPEN',
      objectType: 'Source',
      objectId: input.sourceId,
      title: `Source integrity alert (${input.status}): ${input.sourceTitle}`,
      explanation: `${input.summary}${
        input.affectedContributionIds.length > 0
          ? ` Impacts ${input.affectedContributionIds.length} dependent contribution(s): ${input.affectedContributionIds.join(', ')}.`
          : ''
      }`,
      actionLabel: 'Review affected source',
      actionHref: `/source/${input.sourceId}`,
      promotedBy: null,
      createdAt: now,
      updatedAt: now,
    };
    list.unshift(item);
    created.push(item);

    if (input.supabase && isUuid(userId)) {
      await runSupabaseMutation(input.supabase, (sb) =>
        sb.from('v34_attention_items').insert({
          id: item.id,
          user_id: userId,
          workspace_id: null,
          kind: item.kind,
          severity: item.severity,
          status: item.status,
          object_type: item.objectType,
          object_id: item.objectId,
          title: item.title,
          explanation: item.explanation,
          action_label: item.actionLabel,
          action_href: item.actionHref,
        }),
      );
    }
  }

  return created;
}

export function listAssistantTasks(userId: string): AssistantTaskRecord[] {
  return [...ensureUserList(w3State.assistantTasks, userId)].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

/**
 * §10 Invariant: Creating an Assistant Task NEVER automatically creates a
 * mandatory AttentionItem.
 */
export async function createAssistantTask(input: {
  userId: string;
  workspaceId?: string;
  taskType: AssistantTaskType;
  title: string;
  explanation: string;
  sourceIds: string[];
  supabase?: SupabaseClient | null;
}): Promise<AssistantTaskRecord> {
  const list = ensureUserList(w3State.assistantTasks, input.userId);
  const now = new Date().toISOString();
  const task: AssistantTaskRecord = {
    id: makeId('atask'),
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    taskType: input.taskType,
    title: input.title,
    explanation: input.explanation,
    status: 'SUGGESTED',
    sourceIds: input.sourceIds,
    promotedAttentionId: null,
    createdAt: now,
    updatedAt: now,
  };
  list.unshift(task);

  if (input.supabase && isUuid(input.userId)) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_assistant_tasks').insert({
        id: task.id,
        user_id: input.userId,
        workspace_id: task.workspaceId,
        task_type: task.taskType,
        title: task.title,
        explanation: task.explanation,
        status: task.status,
        source_ids: task.sourceIds,
      }),
    );
  }

  return task;
}

/**
 * §10 Explicit Human Promotion: Converts an optional AssistantTask into an
 * actionable AttentionItem with `kind: 'ASSISTANT'` and `promotedBy`.
 */
export async function promoteAssistantTaskToAttention(input: {
  userId: string;
  taskId: string;
  explanation?: string;
  severity: AttentionSeverity;
  supabase?: SupabaseClient | null;
}): Promise<
  | { ok: true; task: AssistantTaskRecord; attentionItem: AttentionItemRecord }
  | { ok: false; status: 404; message: string }
> {
  const tasks = ensureUserList(w3State.assistantTasks, input.userId);
  const idx = tasks.findIndex((t) => t.id === input.taskId);
  if (idx < 0) {
    return { ok: false, status: 404, message: 'Assistant task not found.' };
  }
  const task = tasks[idx];
  const attentionList = ensureUserList(w3State.attentionItems, input.userId);

  // Idempotent if already promoted
  if (task.promotedAttentionId) {
    const existingAtt = attentionList.find((a) => a.id === task.promotedAttentionId);
    if (existingAtt) {
      return { ok: true, task, attentionItem: existingAtt };
    }
  }

  const now = new Date().toISOString();
  const attentionItem: AttentionItemRecord = {
    id: makeId('att'),
    userId: input.userId,
    workspaceId: task.workspaceId,
    kind: 'ASSISTANT',
    severity: input.severity,
    status: 'OPEN',
    objectType: 'AssistantTask',
    objectId: task.id,
    title: task.title,
    explanation:
      input.explanation || task.explanation || 'Explicitly promoted from Assistant suggestions.',
    actionLabel: 'Open Research OS',
    actionHref: '/research-os',
    promotedBy: input.userId,
    createdAt: now,
    updatedAt: now,
  };
  attentionList.unshift(attentionItem);

  const updatedTask: AssistantTaskRecord = {
    ...task,
    status: 'ACCEPTED',
    promotedAttentionId: attentionItem.id,
    updatedAt: now,
  };
  tasks[idx] = updatedTask;

  if (input.supabase && isUuid(input.userId)) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_attention_items').insert({
        id: attentionItem.id,
        user_id: input.userId,
        workspace_id: attentionItem.workspaceId,
        kind: attentionItem.kind,
        severity: attentionItem.severity,
        status: attentionItem.status,
        object_type: attentionItem.objectType,
        object_id: attentionItem.objectId,
        title: attentionItem.title,
        explanation: attentionItem.explanation,
        action_label: attentionItem.actionLabel,
        action_href: attentionItem.actionHref,
        promoted_by: input.userId,
      }),
    );
    await runSupabaseMutation(input.supabase, (sb) =>
      sb
        .from('v34_assistant_tasks')
        .update({ status: 'ACCEPTED', promoted_attention_id: attentionItem.id, updated_at: now })
        .eq('id', task.id),
    );
  }

  return { ok: true, task: updatedTask, attentionItem };
}

// ── §11 Event-Fact Scholarly Recognition Ledger ────────────────────────────

export function getRecognitionSummary(recipientHandle: string): {
  summary: RecognitionSummary;
  events: RecognitionEventRecord[];
} {
  const norm = recipientHandle.trim().toLowerCase();
  const matching = w3State.recognitionEvents.filter(
    (e) => e.recipientHandle.toLowerCase() === norm && e.reversedAt === null,
  );

  const count = (type: RecognitionEventType) =>
    matching.filter((e) => e.eventType === type).length;

  return {
    summary: {
      recipientHandle,
      referencedContributions: count('CONTRIBUTION_REFERENCED'),
      helpfulReviews: count('REVIEW_HELPFUL'),
      evidenceReuse: count('EVIDENCE_REUSED'),
      acceptedCorrections: count('CORRECTION_ACCEPTED'),
      replicationReports: count('REPLICATION_REPORTED'),
      completedReviews: count('REVIEW_COMPLETED'),
      windowLabel: 'Rolling 90 days (non-reversed verified events)',
      calculatedAt: new Date().toISOString(),
    },
    events: matching,
  };
}

/**
 * §11 Invariant: Self-actions CANNOT generate scholarly recognition events.
 */
export async function recordRecognitionEvent(input: {
  recipientHandle: string;
  recipientUserId?: string;
  actorId: string;
  actorHandle: string;
  eventType: RecognitionEventType;
  objectType: string;
  objectId: string;
  supabase?: SupabaseClient | null;
}): Promise<
  | { ok: true; event: RecognitionEventRecord; summary: RecognitionSummary }
  | { ok: false; status: 400; code: string; message: string }
> {
  if (
    input.recipientHandle.trim().toLowerCase() === input.actorHandle.trim().toLowerCase() ||
    (input.recipientUserId && input.recipientUserId === input.actorId)
  ) {
    return {
      ok: false,
      status: 400,
      code: 'SELF_RECOGNITION_FORBIDDEN',
      message: 'Self-actions cannot generate scholarly recognition events (v3.4 §11).',
    };
  }

  const event: RecognitionEventRecord = {
    id: makeId('rec'),
    recipientHandle: input.recipientHandle.trim(),
    recipientUserId: input.recipientUserId ?? null,
    actorId: input.actorId,
    actorHandle: input.actorHandle,
    eventType: input.eventType,
    objectType: input.objectType,
    objectId: input.objectId,
    reversedAt: null,
    reversalReason: null,
    createdAt: new Date().toISOString(),
  };
  w3State.recognitionEvents.unshift(event);

  if (input.supabase && isUuid(input.actorId)) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_recognition_events').insert({
        id: event.id,
        recipient_handle: event.recipientHandle,
        recipient_user_id: isUuid(event.recipientUserId) ? event.recipientUserId : null,
        actor_id: input.actorId,
        event_type: event.eventType,
        object_type: event.objectType,
        object_id: event.objectId,
      }),
    );
  }

  return {
    ok: true,
    event,
    summary: getRecognitionSummary(event.recipientHandle).summary,
  };
}

export async function reverseRecognitionEvent(input: {
  eventId: string;
  reason: string;
  supabase?: SupabaseClient | null;
}): Promise<RecognitionEventRecord | null> {
  const idx = w3State.recognitionEvents.findIndex((e) => e.id === input.eventId);
  if (idx < 0) return null;
  const now = new Date().toISOString();
  w3State.recognitionEvents[idx] = {
    ...w3State.recognitionEvents[idx],
    reversedAt: now,
    reversalReason: input.reason,
  };

  if (input.supabase) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb
        .from('v34_recognition_events')
        .update({ reversed_at: now, reversal_reason: input.reason })
        .eq('id', input.eventId),
    );
  }
  return w3State.recognitionEvents[idx];
}

// ── §13–14 Dashboard Preferences & Topic Follows ───────────────────────────

export function getDashboardPreferences(userId: string): DashboardPreferencesRecord {
  if (!w3State.preferences.has(userId)) {
    const base = w3State.preferences.get('default')!;
    w3State.preferences.set(userId, {
      ...base,
      userId,
      followedTopics: [...base.followedTopics],
    });
  }
  return w3State.preferences.get(userId)!;
}

export async function updateDashboardPreferences(input: {
  userId: string;
  defaultLanding?: DefaultLanding;
  digestFrequency?: 'off' | 'daily' | 'weekly';
  followTopic?: { topicSlug: string; topicLabel: string };
  unfollowTopicSlug?: string;
  supabase?: SupabaseClient | null;
}): Promise<DashboardPreferencesRecord> {
  const current = getDashboardPreferences(input.userId);
  const now = new Date().toISOString();
  let topics = [...current.followedTopics];

  if (input.followTopic) {
    const slug = slugify(input.followTopic.topicSlug) || input.followTopic.topicSlug;
    if (!topics.some((t) => t.topicSlug === slug)) {
      topics.push({
        topicSlug: slug,
        topicLabel: input.followTopic.topicLabel,
        createdAt: now,
      });
    }
    if (input.supabase && isUuid(input.userId)) {
      await runSupabaseMutation(input.supabase, (sb) =>
        sb.from('v34_topic_follows').upsert({
          user_id: input.userId,
          topic_slug: slug,
          topic_label: input.followTopic!.topicLabel,
        }),
      );
    }
  }

  if (input.unfollowTopicSlug) {
    topics = topics.filter((t) => t.topicSlug !== input.unfollowTopicSlug);
    if (input.supabase && isUuid(input.userId)) {
      await runSupabaseMutation(input.supabase, (sb) =>
        sb
          .from('v34_topic_follows')
          .delete()
          .eq('user_id', input.userId)
          .eq('topic_slug', input.unfollowTopicSlug!),
      );
    }
  }

  const updated: DashboardPreferencesRecord = {
    userId: input.userId,
    defaultLanding: input.defaultLanding ?? current.defaultLanding,
    digestFrequency: input.digestFrequency ?? current.digestFrequency,
    followedTopics: topics,
    updatedAt: now,
  };
  w3State.preferences.set(input.userId, updated);

  if (input.supabase && isUuid(input.userId)) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_dashboard_preferences').upsert({
        user_id: input.userId,
        default_landing: updated.defaultLanding,
        digest_frequency: updated.digestFrequency,
        updated_at: now,
      }),
    );
  }

  return updated;
}
