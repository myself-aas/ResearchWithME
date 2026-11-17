/**
 * ResearchWithME v3.4 Wave 2 Repository (`lib/v34/wave2-store.ts`).
 *
 * Manages Collaborative Workspaces & Projects (§7 Workspace/Project boundary),
 * Formal Peer Reviews, Rebuttals & Editorial Decisions (§6), and persists live
 * authenticated writes directly to Supabase `v34_*` tables via RLS while
 * keeping deterministic starter records for previews & Vitest runs.
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
import { getContributionById } from './store';
import type {
  MilestoneStatus,
  ProjectStage,
  ReviewDecisionOutcome,
  WorkspaceRole,
} from './wave2-contracts';

// ── Domain Types ───────────────────────────────────────────────────────────

export interface WorkspaceMemberRecord {
  workspaceId: string;
  userId: string;
  handle: string;
  displayName: string;
  role: WorkspaceRole;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  createdAt: string;
}

export interface WorkspaceRecord {
  id: string;
  slug: string;
  name: string;
  description: string;
  visibility: 'public' | 'workspace' | 'private';
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMemberRecord {
  projectId: string;
  workspaceId: string;
  userId: string;
  handle: string;
  displayName: string;
  role: WorkspaceRole;
  createdAt: string;
}

export interface ProjectMilestoneRecord {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: MilestoneStatus;
  dueAt: string | null;
  completedAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectObjectLink {
  projectId: string;
  objectType: 'source' | 'evidence' | 'claim' | 'contribution';
  objectId: string;
  createdAt: string;
}

export interface ResearchProjectRecord {
  id: string;
  workspaceId: string;
  slug: string;
  title: string;
  objective: string;
  stage: ProjectStage;
  visibility: 'public' | 'workspace' | 'private';
  topics: string[];
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary extends ResearchProjectRecord {
  workspaceName: string;
  workspaceSlug: string;
  members: ProjectMemberRecord[];
  milestones: ProjectMilestoneRecord[];
  objects: ProjectObjectLink[];
}

export interface ReviewItemRecord {
  id: string;
  reviewId: string;
  itemType: 'review' | 'suggestion' | 'comment';
  scope: string | null;
  body: string;
  status: 'open' | 'accepted' | 'rejected' | 'resolved';
  authorId: string | null;
  authorName: string;
  anonymous: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewRebuttalRecord {
  id: string;
  reviewId: string;
  reviewItemIds: string[];
  authorId: string | null;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface ReviewDecisionRecord {
  id: string;
  reviewId: string;
  outcome: ReviewDecisionOutcome;
  rationale: string;
  decidedBy: string | null;
  decidedByName: string;
  createdAt: string;
}

export interface FormalReviewRecord {
  id: string;
  contributionId: string;
  contributionVersion: number;
  requesterId: string | null;
  reviewerId: string | null;
  reviewerHandle: string | null;
  reviewerName: string;
  anonymous: boolean;
  scope: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'SUBMITTED' | 'RESOLVED' | 'WITHDRAWN';
  recommendation: ReviewDecisionOutcome | null;
  dueAt: string | null;
  items: ReviewItemRecord[];
  rebuttals: ReviewRebuttalRecord[];
  decisions: ReviewDecisionRecord[];
  createdAt: string;
  updatedAt: string;
}

// ── Seeded Starter State ───────────────────────────────────────────────────

interface Wave2State {
  workspaces: Map<string, WorkspaceRecord>;
  workspaceMembers: Map<string, WorkspaceMemberRecord[]>;
  projects: Map<string, ResearchProjectRecord>;
  projectMembers: Map<string, ProjectMemberRecord[]>;
  milestones: Map<string, ProjectMilestoneRecord[]>;
  projectObjects: Map<string, ProjectObjectLink[]>;
  reviews: Map<string, FormalReviewRecord>;
}

function createWave2Seed(): Wave2State {
  const now = '2026-11-16T12:00:00.000Z';

  const workspaces = new Map<string, WorkspaceRecord>([
    [
      'ws-open-reasoning',
      {
        id: 'ws-open-reasoning',
        slug: 'open-reasoning-systems',
        name: 'Open Reasoning & Inference Lab',
        description:
          'Collaborative research workspace evaluating open reasoning checkpoints, KV-cache serving architectures, and reproducible benchmark harnesses.',
        visibility: 'public',
        ownerId: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
  ]);

  const workspaceMembers = new Map<string, WorkspaceMemberRecord[]>([
    [
      'ws-open-reasoning',
      [
        {
          workspaceId: 'ws-open-reasoning',
          userId: 'local-contributor',
          handle: 'myself-aas',
          displayName: 'Ashif Ahmed Shuvo',
          role: 'OWNER',
          status: 'ACTIVE',
          createdAt: now,
        },
        {
          workspaceId: 'ws-open-reasoning',
          userId: 'user-reviewer-1',
          handle: 'dr-lin-eval',
          displayName: 'Dr. Mei Lin',
          role: 'REVIEWER',
          status: 'ACTIVE',
          createdAt: now,
        },
      ],
    ],
  ]);

  const projects = new Map<string, ResearchProjectRecord>([
    [
      'proj-reasoning-audit',
      {
        id: 'proj-reasoning-audit',
        workspaceId: 'ws-open-reasoning',
        slug: 'reasoning-cold-start-replication',
        title: 'Cold-Start SFT vs. Pure RL Replication Study',
        objective:
          'Audit published reasoning benchmark gains against open-weight checkpoints, isolating verifiable accuracy lifts from formatting and language-mixing artifacts.',
        stage: 'SYNTHESIS',
        visibility: 'public',
        topics: ['Machine Learning', 'Reasoning Models', 'Reproducibility'],
        ownerId: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
    [
      'proj-serving-throughput',
      {
        id: 'proj-serving-throughput',
        workspaceId: 'ws-open-reasoning',
        slug: 'heterogeneous-kv-cache-serving',
        title: 'Heterogeneous Long-Context Serving Benchmarks',
        objective:
          'Measure paged KV-cache efficiency and prefix caching tradeoffs across real multi-paper scholarly synthesis workloads.',
        stage: 'UNDER_REVIEW',
        visibility: 'public',
        topics: ['Systems', 'LLM Inference', 'Open-Source Tools'],
        ownerId: null,
        createdAt: '2026-11-15T14:00:00.000Z',
        updatedAt: '2026-11-16T09:00:00.000Z',
      },
    ],
  ]);

  const projectMembers = new Map<string, ProjectMemberRecord[]>([
    [
      'proj-reasoning-audit',
      [
        {
          projectId: 'proj-reasoning-audit',
          workspaceId: 'ws-open-reasoning',
          userId: 'local-contributor',
          handle: 'myself-aas',
          displayName: 'Ashif Ahmed Shuvo',
          role: 'OWNER',
          createdAt: now,
        },
        {
          projectId: 'proj-reasoning-audit',
          workspaceId: 'ws-open-reasoning',
          userId: 'user-reviewer-1',
          handle: 'dr-lin-eval',
          displayName: 'Dr. Mei Lin',
          role: 'REVIEWER',
          createdAt: now,
        },
      ],
    ],
    [
      'proj-serving-throughput',
      [
        {
          projectId: 'proj-serving-throughput',
          workspaceId: 'ws-open-reasoning',
          userId: 'local-contributor',
          handle: 'myself-aas',
          displayName: 'Ashif Ahmed Shuvo',
          role: 'OWNER',
          createdAt: now,
        },
      ],
    ],
  ]);

  const milestones = new Map<string, ProjectMilestoneRecord[]>([
    [
      'proj-reasoning-audit',
      [
        {
          id: 'ms-1',
          projectId: 'proj-reasoning-audit',
          title: 'Resolve canonical primary sources & section locators',
          description: 'Pin arXiv v1 snapshot and verify Figure 2 / Table 1 numbers.',
          status: 'COMPLETED',
          dueAt: '2026-11-12T00:00:00.000Z',
          completedAt: '2026-11-11T16:00:00.000Z',
          sortOrder: 0,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'ms-2',
          projectId: 'proj-reasoning-audit',
          title: 'Complete formal peer review & rebuttal pass',
          description: 'Address reviewer methodological scope questions on 7B–32B distillation limits.',
          status: 'IN_PROGRESS',
          dueAt: '2026-11-22T00:00:00.000Z',
          completedAt: null,
          sortOrder: 1,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'ms-3',
          projectId: 'proj-reasoning-audit',
          title: 'Publish comparative synthesis report',
          description: 'Compile verified claims, contradictions, and open replication protocol.',
          status: 'PLANNED',
          dueAt: '2026-11-30T00:00:00.000Z',
          completedAt: null,
          sortOrder: 2,
          createdAt: now,
          updatedAt: now,
        },
      ],
    ],
    [
      'proj-serving-throughput',
      [
        {
          id: 'ms-10',
          projectId: 'proj-serving-throughput',
          title: 'Capture single-node vLLM KV-cache fragmentation metrics',
          description: 'Benchmark mixed 512–16,384 token prompt traces.',
          status: 'COMPLETED',
          dueAt: '2026-11-14T00:00:00.000Z',
          completedAt: '2026-11-14T10:00:00.000Z',
          sortOrder: 0,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'ms-11',
          projectId: 'proj-serving-throughput',
          title: 'Verify prefix-caching + LoRA swap-space edge cases',
          description: 'Document memory pressure ceiling under concurrent adapter switching.',
          status: 'IN_PROGRESS',
          dueAt: '2026-11-24T00:00:00.000Z',
          completedAt: null,
          sortOrder: 1,
          createdAt: now,
          updatedAt: now,
        },
      ],
    ],
  ]);

  const projectObjects = new Map<string, ProjectObjectLink[]>([
    [
      'proj-reasoning-audit',
      [
        { projectId: 'proj-reasoning-audit', objectType: 'source', objectId: 'src-arxiv-2501-12948', createdAt: now },
        { projectId: 'proj-reasoning-audit', objectType: 'evidence', objectId: 'ev-grpo-emergence', createdAt: now },
        { projectId: 'proj-reasoning-audit', objectType: 'claim', objectId: 'clm-rl-reasoning-tradeoff', createdAt: now },
        { projectId: 'proj-reasoning-audit', objectType: 'contribution', objectId: 'contrib-rl-cold-start', createdAt: now },
      ],
    ],
    [
      'proj-serving-throughput',
      [
        { projectId: 'proj-serving-throughput', objectType: 'source', objectId: 'src-github-vllm', createdAt: now },
        { projectId: 'proj-serving-throughput', objectType: 'evidence', objectId: 'ev-paged-kv-memory', createdAt: now },
        { projectId: 'proj-serving-throughput', objectType: 'claim', objectId: 'clm-paged-attention-utilization', createdAt: now },
        { projectId: 'proj-serving-throughput', objectType: 'contribution', objectId: 'contrib-vllm-paged-review', createdAt: now },
      ],
    ],
  ]);

  const reviews = new Map<string, FormalReviewRecord>([
    [
      'rev-rl-cold-start-1',
      {
        id: 'rev-rl-cold-start-1',
        contributionId: 'contrib-rl-cold-start',
        contributionVersion: 1,
        requesterId: null,
        reviewerId: 'user-reviewer-1',
        reviewerHandle: null, // redacted when anonymous is true (§25.2)
        reviewerName: 'Anonymous reviewer',
        anonymous: true,
        scope: 'Methodology & benchmark generalization boundaries',
        status: 'IN_PROGRESS',
        recommendation: 'MINOR_REVISION',
        dueAt: '2026-11-20T00:00:00.000Z',
        items: [
          {
            id: 'ri-00000001-0000-4000-8000-000000000001',
            reviewId: 'rev-rl-cold-start-1',
            itemType: 'review',
            scope: 'Section 2.2 · Evidence extraction',
            body: 'The AIME 2024 pass@1 progression is accurately cited from Table 1. Clarify whether readability failures were measured quantitatively or qualitatively in the original report.',
            status: 'open',
            authorId: 'user-reviewer-1',
            authorName: 'Anonymous reviewer',
            anonymous: true,
            createdAt: '2026-11-16T13:00:00.000Z',
            updatedAt: '2026-11-16T13:00:00.000Z',
          },
          {
            id: 'ri-00000002-0000-4000-8000-000000000002',
            reviewId: 'rev-rl-cold-start-1',
            itemType: 'suggestion',
            scope: 'Scope & Limitations block',
            body: 'Recommend adding an explicit note distinguishing distilled 32B replication evidence from full-scale 671B GRPO training runs.',
            status: 'accepted',
            authorId: 'user-reviewer-1',
            authorName: 'Anonymous reviewer',
            anonymous: true,
            createdAt: '2026-11-16T13:15:00.000Z',
            updatedAt: '2026-11-16T14:00:00.000Z',
          },
        ],
        rebuttals: [
          {
            id: 'reb-00000003-0000-4000-8000-000000000003',
            reviewId: 'rev-rl-cold-start-1',
            reviewItemIds: ['ri-00000001-0000-4000-8000-000000000001'],
            authorId: 'local-contributor',
            authorName: 'Ashif Ahmed Shuvo',
            body: 'Good catch — language mixing and readability issues in DeepSeek-R1-Zero are documented qualitatively in Section 2.2.3 rather than as a numeric rubric. Added explicit scope caveat in the limitations block.',
            createdAt: '2026-11-16T14:30:00.000Z',
          },
        ],
        decisions: [],
        createdAt: '2026-11-16T13:00:00.000Z',
        updatedAt: '2026-11-16T14:30:00.000Z',
      },
    ],
  ]);

  return {
    workspaces,
    workspaceMembers,
    projects,
    projectMembers,
    milestones,
    projectObjects,
    reviews,
  };
}

let w2State: Wave2State = createWave2Seed();

export function resetWave2StoreForTesting() {
  w2State = createWave2Seed();
}

function makeId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(6).toString('hex')}`;
}

// ── Workspaces & Projects (§7) ─────────────────────────────────────────────

export async function listWorkspaces(supabase?: SupabaseClient | null): Promise<WorkspaceRecord[]> {
  const sb = supabase ?? getOptionalPublicSupabase();
  const remote = await runSupabaseQuery<Record<string, unknown>[]>(sb, (c) =>
    c.from('v34_workspaces').select('*').order('updated_at', { ascending: false }).limit(50),
  );
  const byId = new Map<string, WorkspaceRecord>(w2State.workspaces);
  if (remote) {
    for (const row of remote) {
      const rec: WorkspaceRecord = {
        id: String(row.id),
        slug: String(row.slug),
        name: String(row.name),
        description: String(row.description ?? ''),
        visibility: (row.visibility as WorkspaceRecord['visibility']) ?? 'public',
        ownerId: typeof row.owner_id === 'string' ? row.owner_id : null,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      };
      byId.set(rec.id, rec);
    }
  }
  return [...byId.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createWorkspace(input: {
  name: string;
  description: string;
  visibility: 'public' | 'workspace' | 'private';
  ownerId: string;
  ownerHandle: string;
  ownerName: string;
  supabase?: SupabaseClient | null;
}): Promise<WorkspaceRecord> {
  const now = new Date().toISOString();
  const id = makeId('ws');
  const baseSlug = slugify(input.name) || id;
  const slug = [...w2State.workspaces.values()].some((w) => w.slug === baseSlug)
    ? `${baseSlug}-${id.slice(-4)}`
    : baseSlug;

  const workspace: WorkspaceRecord = {
    id,
    slug,
    name: input.name,
    description: input.description,
    visibility: input.visibility,
    ownerId: input.ownerId,
    createdAt: now,
    updatedAt: now,
  };
  w2State.workspaces.set(id, workspace);
  w2State.workspaceMembers.set(id, [
    {
      workspaceId: id,
      userId: input.ownerId,
      handle: input.ownerHandle,
      displayName: input.ownerName,
      role: 'OWNER',
      status: 'ACTIVE',
      createdAt: now,
    },
  ]);

  if (input.supabase && isUuid(input.ownerId)) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_workspaces').upsert({
        id: workspace.id,
        slug: workspace.slug,
        name: workspace.name,
        description: workspace.description,
        visibility: workspace.visibility,
        owner_id: input.ownerId,
      }),
    );
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_workspace_members').upsert({
        workspace_id: workspace.id,
        user_id: input.ownerId,
        handle: input.ownerHandle,
        display_name: input.ownerName,
        role: 'OWNER',
        status: 'ACTIVE',
      }),
    );
  }

  return workspace;
}

export function listWorkspaceMembers(workspaceId: string): WorkspaceMemberRecord[] {
  return [...(w2State.workspaceMembers.get(workspaceId) ?? [])];
}

export async function addWorkspaceMember(input: {
  workspaceId: string;
  userId: string;
  handle: string;
  displayName: string;
  role: WorkspaceRole;
  supabase?: SupabaseClient | null;
}): Promise<{ ok: true; member: WorkspaceMemberRecord } | { ok: false; status: 404; message: string }> {
  if (!w2State.workspaces.has(input.workspaceId)) {
    return { ok: false, status: 404, message: 'Workspace not found.' };
  }
  const now = new Date().toISOString();
  const member: WorkspaceMemberRecord = {
    workspaceId: input.workspaceId,
    userId: input.userId,
    handle: input.handle,
    displayName: input.displayName,
    role: input.role,
    status: 'ACTIVE',
    createdAt: now,
  };
  const existing = w2State.workspaceMembers.get(input.workspaceId) ?? [];
  const idx = existing.findIndex((m) => m.userId === input.userId);
  if (idx >= 0) existing[idx] = member;
  else existing.push(member);
  w2State.workspaceMembers.set(input.workspaceId, existing);

  if (input.supabase && isUuid(input.userId)) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_workspace_members').upsert({
        workspace_id: input.workspaceId,
        user_id: input.userId,
        handle: input.handle,
        display_name: input.displayName,
        role: input.role,
        status: 'ACTIVE',
      }),
    );
  }

  return { ok: true, member };
}

function hydrateProjectSummary(project: ResearchProjectRecord): ProjectSummary {
  const ws = w2State.workspaces.get(project.workspaceId);
  return {
    ...project,
    workspaceName: ws?.name ?? 'Research Workspace',
    workspaceSlug: ws?.slug ?? project.workspaceId,
    members: [...(w2State.projectMembers.get(project.id) ?? [])],
    milestones: [...(w2State.milestones.get(project.id) ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    objects: [...(w2State.projectObjects.get(project.id) ?? [])],
  };
}

export async function listProjects(
  options?: { workspaceId?: string; stage?: ProjectStage | 'all'; supabase?: SupabaseClient | null },
): Promise<ProjectSummary[]> {
  const sb = options?.supabase ?? getOptionalPublicSupabase();
  const remote = await runSupabaseQuery<Record<string, unknown>[]>(sb, (c) =>
    c.from('v34_projects').select('*').order('updated_at', { ascending: false }).limit(50),
  );
  const byId = new Map<string, ResearchProjectRecord>(w2State.projects);
  if (remote) {
    for (const row of remote) {
      const rec: ResearchProjectRecord = {
        id: String(row.id),
        workspaceId: String(row.workspace_id),
        slug: String(row.slug),
        title: String(row.title),
        objective: String(row.objective ?? ''),
        stage: (row.stage as ProjectStage) ?? 'SCOPING',
        visibility: (row.visibility as ResearchProjectRecord['visibility']) ?? 'public',
        topics: Array.isArray(row.topics) ? row.topics.map(String) : [],
        ownerId: typeof row.owner_id === 'string' ? row.owner_id : null,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      };
      byId.set(rec.id, rec);
    }
  }

  return [...byId.values()]
    .filter((p) => {
      if (options?.workspaceId && p.workspaceId !== options.workspaceId) return false;
      if (options?.stage && options.stage !== 'all' && p.stage !== options.stage) return false;
      return true;
    })
    .map(hydrateProjectSummary)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getProjectByIdOrSlug(
  idOrSlug: string,
  supabase?: SupabaseClient | null,
): Promise<ProjectSummary | null> {
  const all = await listProjects({ supabase });
  return all.find((p) => p.id === idOrSlug || p.slug === idOrSlug) ?? null;
}

export async function createProject(input: {
  workspaceId: string;
  title: string;
  objective: string;
  stage: ProjectStage;
  visibility: 'public' | 'workspace' | 'private';
  topics: string[];
  ownerId: string;
  ownerHandle: string;
  ownerName: string;
  supabase?: SupabaseClient | null;
}): Promise<{ ok: true; project: ProjectSummary } | { ok: false; status: 404; message: string }> {
  const ws = w2State.workspaces.get(input.workspaceId);
  if (!ws) {
    return { ok: false, status: 404, message: 'Owning workspace not found.' };
  }

  const now = new Date().toISOString();
  const id = makeId('proj');
  const baseSlug = slugify(input.title) || id;
  const slug = [...w2State.projects.values()].some((p) => p.slug === baseSlug)
    ? `${baseSlug}-${id.slice(-4)}`
    : baseSlug;

  // Ensure project creator is an active workspace member (§7 invariant).
  const wsMembers = w2State.workspaceMembers.get(input.workspaceId) ?? [];
  if (!wsMembers.some((m) => m.userId === input.ownerId && m.status === 'ACTIVE')) {
    wsMembers.push({
      workspaceId: input.workspaceId,
      userId: input.ownerId,
      handle: input.ownerHandle,
      displayName: input.ownerName,
      role: 'CONTRIBUTOR',
      status: 'ACTIVE',
      createdAt: now,
    });
    w2State.workspaceMembers.set(input.workspaceId, wsMembers);
  }

  const project: ResearchProjectRecord = {
    id,
    workspaceId: input.workspaceId,
    slug,
    title: input.title,
    objective: input.objective,
    stage: input.stage,
    visibility: input.visibility,
    topics: input.topics,
    ownerId: input.ownerId,
    createdAt: now,
    updatedAt: now,
  };
  w2State.projects.set(id, project);
  w2State.projectMembers.set(id, [
    {
      projectId: id,
      workspaceId: input.workspaceId,
      userId: input.ownerId,
      handle: input.ownerHandle,
      displayName: input.ownerName,
      role: 'OWNER',
      createdAt: now,
    },
  ]);
  w2State.milestones.set(id, []);
  w2State.projectObjects.set(id, []);

  if (input.supabase && isUuid(input.ownerId)) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_projects').upsert({
        id: project.id,
        workspace_id: project.workspaceId,
        slug: project.slug,
        title: project.title,
        objective: project.objective,
        stage: project.stage,
        visibility: project.visibility,
        topics: project.topics,
        owner_id: input.ownerId,
      }),
    );
  }

  return { ok: true, project: hydrateProjectSummary(project) };
}

export async function updateProject(
  idOrSlug: string,
  patch: Partial<Pick<ResearchProjectRecord, 'title' | 'objective' | 'stage' | 'visibility' | 'topics'>>,
  supabase?: SupabaseClient | null,
): Promise<ProjectSummary | null> {
  const existing = [...w2State.projects.values()].find((p) => p.id === idOrSlug || p.slug === idOrSlug);
  if (!existing) return null;
  const updated: ResearchProjectRecord = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  w2State.projects.set(existing.id, updated);

  if (supabase) {
    await runSupabaseMutation(supabase, (sb) =>
      sb
        .from('v34_projects')
        .update({
          title: updated.title,
          objective: updated.objective,
          stage: updated.stage,
          visibility: updated.visibility,
          topics: updated.topics,
          updated_at: updated.updatedAt,
        })
        .eq('id', updated.id),
    );
  }

  return hydrateProjectSummary(updated);
}

/**
 * Enforces v3.4 §7 hard invariant:
 * A ProjectMember MUST resolve to an active WorkspaceMember in the project's workspace.
 */
export async function addProjectMember(input: {
  projectId: string;
  userId: string;
  role: WorkspaceRole;
  supabase?: SupabaseClient | null;
}): Promise<
  | { ok: true; member: ProjectMemberRecord }
  | { ok: false; status: 403 | 404; code: string; message: string }
> {
  const project = [...w2State.projects.values()].find(
    (p) => p.id === input.projectId || p.slug === input.projectId,
  );
  if (!project) {
    return { ok: false, status: 404, code: 'PROJECT_NOT_FOUND', message: 'Project not found.' };
  }

  const wsMembers = w2State.workspaceMembers.get(project.workspaceId) ?? [];
  const wsMember = wsMembers.find((m) => m.userId === input.userId && m.status === 'ACTIVE');
  if (!wsMember) {
    return {
      ok: false,
      status: 403,
      code: 'WORKSPACE_MEMBERSHIP_REQUIRED',
      message:
        'Project members must first belong to the owning workspace as an active workspace member (v3.4 §7).',
    };
  }

  const member: ProjectMemberRecord = {
    projectId: project.id,
    workspaceId: project.workspaceId,
    userId: wsMember.userId,
    handle: wsMember.handle,
    displayName: wsMember.displayName,
    role: input.role,
    createdAt: new Date().toISOString(),
  };
  const current = w2State.projectMembers.get(project.id) ?? [];
  const idx = current.findIndex((m) => m.userId === member.userId);
  if (idx >= 0) current[idx] = member;
  else current.push(member);
  w2State.projectMembers.set(project.id, current);

  if (input.supabase && isUuid(input.userId)) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_project_members').upsert({
        project_id: project.id,
        workspace_id: project.workspaceId,
        user_id: input.userId,
        role: input.role,
      }),
    );
  }

  return { ok: true, member };
}

export async function addProjectMilestone(input: {
  projectId: string;
  title: string;
  description: string;
  status: MilestoneStatus;
  dueAt?: string;
  supabase?: SupabaseClient | null;
}): Promise<ProjectMilestoneRecord | null> {
  const project = [...w2State.projects.values()].find(
    (p) => p.id === input.projectId || p.slug === input.projectId,
  );
  if (!project) return null;

  const list = w2State.milestones.get(project.id) ?? [];
  const now = new Date().toISOString();
  const milestone: ProjectMilestoneRecord = {
    id: makeId('ms'),
    projectId: project.id,
    title: input.title,
    description: input.description,
    status: input.status,
    dueAt: input.dueAt ?? null,
    completedAt: input.status === 'COMPLETED' ? now : null,
    sortOrder: list.length,
    createdAt: now,
    updatedAt: now,
  };
  list.push(milestone);
  w2State.milestones.set(project.id, list);

  if (input.supabase) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_project_milestones').insert({
        id: milestone.id,
        project_id: project.id,
        title: milestone.title,
        description: milestone.description,
        status: milestone.status,
        due_at: milestone.dueAt,
        completed_at: milestone.completedAt,
        sort_order: milestone.sortOrder,
      }),
    );
  }

  return milestone;
}

export async function updateProjectMilestone(input: {
  projectId: string;
  milestoneId: string;
  title?: string;
  status?: MilestoneStatus;
  supabase?: SupabaseClient | null;
}): Promise<ProjectMilestoneRecord | null> {
  const project = [...w2State.projects.values()].find(
    (p) => p.id === input.projectId || p.slug === input.projectId,
  );
  if (!project) return null;
  const list = w2State.milestones.get(project.id) ?? [];
  const idx = list.findIndex((m) => m.id === input.milestoneId);
  if (idx < 0) return null;

  const now = new Date().toISOString();
  const existing = list[idx];
  const nextStatus = input.status ?? existing.status;
  const updated: ProjectMilestoneRecord = {
    ...existing,
    title: input.title ?? existing.title,
    status: nextStatus,
    completedAt: nextStatus === 'COMPLETED' ? existing.completedAt ?? now : null,
    updatedAt: now,
  };
  list[idx] = updated;
  w2State.milestones.set(project.id, list);

  if (input.supabase) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb
        .from('v34_project_milestones')
        .update({
          title: updated.title,
          status: updated.status,
          completed_at: updated.completedAt,
          updated_at: updated.updatedAt,
        })
        .eq('id', updated.id),
    );
  }

  return updated;
}

export async function linkProjectObject(input: {
  projectId: string;
  objectType: ProjectObjectLink['objectType'];
  objectId: string;
  addedBy: string | null;
  supabase?: SupabaseClient | null;
}): Promise<ProjectObjectLink | null> {
  const project = [...w2State.projects.values()].find(
    (p) => p.id === input.projectId || p.slug === input.projectId,
  );
  if (!project) return null;

  const list = w2State.projectObjects.get(project.id) ?? [];
  const exists = list.find((o) => o.objectType === input.objectType && o.objectId === input.objectId);
  if (exists) return exists;

  const link: ProjectObjectLink = {
    projectId: project.id,
    objectType: input.objectType,
    objectId: input.objectId,
    createdAt: new Date().toISOString(),
  };
  list.push(link);
  w2State.projectObjects.set(project.id, list);

  if (input.supabase) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_project_objects').upsert({
        project_id: project.id,
        object_type: input.objectType,
        object_id: input.objectId,
        added_by: isUuid(input.addedBy) ? input.addedBy : null,
      }),
    );
  }

  return link;
}

export async function unlinkProjectObject(input: {
  projectId: string;
  objectType: string;
  objectId: string;
  supabase?: SupabaseClient | null;
}): Promise<boolean> {
  const project = [...w2State.projects.values()].find(
    (p) => p.id === input.projectId || p.slug === input.projectId,
  );
  if (!project) return false;
  const list = w2State.projectObjects.get(project.id) ?? [];
  const next = list.filter((o) => !(o.objectType === input.objectType && o.objectId === input.objectId));
  if (next.length === list.length) return false;
  w2State.projectObjects.set(project.id, next);

  if (input.supabase) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb
        .from('v34_project_objects')
        .delete()
        .eq('project_id', project.id)
        .eq('object_type', input.objectType)
        .eq('object_id', input.objectId),
    );
  }

  return true;
}

// ── Formal Peer Reviews, Rebuttals & Editorial Decisions (§6) ──────────────

function sanitizeReviewItemForAnonymity(item: ReviewItemRecord): ReviewItemRecord {
  return {
    ...item,
    authorId: item.anonymous ? null : item.authorId,
    authorName: item.anonymous ? 'Anonymous reviewer' : item.authorName,
  };
}

function sanitizeReviewForAnonymity(review: FormalReviewRecord): FormalReviewRecord {
  return {
    ...review,
    reviewerId: review.anonymous ? null : review.reviewerId,
    reviewerHandle: review.anonymous ? null : review.reviewerHandle,
    reviewerName: review.anonymous ? 'Anonymous reviewer' : review.reviewerName,
    items: review.items.map(sanitizeReviewItemForAnonymity),
  };
}

export function listFormalReviews(contributionId?: string): FormalReviewRecord[] {
  return [...w2State.reviews.values()]
    .filter((r) => !contributionId || r.contributionId === contributionId)
    .map(sanitizeReviewForAnonymity)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getFormalReview(reviewId: string): FormalReviewRecord | null {
  const r = w2State.reviews.get(reviewId);
  return r ? sanitizeReviewForAnonymity(r) : null;
}

export async function createFormalReview(input: {
  contributionId: string;
  scope: string;
  anonymous: boolean;
  actorId: string;
  actorHandle: string;
  actorName: string;
  initialItem?: { itemType: 'review' | 'suggestion' | 'comment'; body: string; scope?: string };
  supabase?: SupabaseClient | null;
}): Promise<{ ok: true; review: FormalReviewRecord } | { ok: false; status: 404; message: string }> {
  const contrib = getContributionById(input.contributionId);
  if (!contrib) {
    return { ok: false, status: 404, message: 'Contribution not found.' };
  }

  const now = new Date().toISOString();
  const id = makeId('rev');
  const items: ReviewItemRecord[] = [];
  if (input.initialItem) {
    items.push({
      id: makeId('ri'),
      reviewId: id,
      itemType: input.initialItem.itemType,
      scope: input.initialItem.scope ?? input.scope,
      body: input.initialItem.body,
      status: 'open',
      authorId: input.actorId,
      authorName: input.anonymous ? 'Anonymous reviewer' : input.actorName,
      anonymous: input.anonymous,
      createdAt: now,
      updatedAt: now,
    });
  }

  const review: FormalReviewRecord = {
    id,
    contributionId: contrib.id,
    contributionVersion: contrib.version,
    requesterId: contrib.authorId,
    reviewerId: input.actorId,
    reviewerHandle: input.anonymous ? null : input.actorHandle,
    reviewerName: input.anonymous ? 'Anonymous reviewer' : input.actorName,
    anonymous: input.anonymous,
    scope: input.scope,
    status: items.length > 0 ? 'IN_PROGRESS' : 'OPEN',
    recommendation: null,
    dueAt: null,
    items,
    rebuttals: [],
    decisions: [],
    createdAt: now,
    updatedAt: now,
  };
  w2State.reviews.set(id, review);

  if (input.supabase) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_reviews').insert({
        id: review.id,
        contribution_id: review.contributionId,
        contribution_version: review.contributionVersion,
        reviewer_id: isUuid(input.actorId) ? input.actorId : null,
        reviewer_handle: review.reviewerHandle,
        reviewer_name: review.reviewerName,
        anonymous: review.anonymous,
        scope: review.scope,
        status: review.status,
      }),
    );
    for (const item of items) {
      await runSupabaseMutation(input.supabase, (sb) =>
        sb.from('v34_review_items').insert({
          id: item.id,
          review_id: review.id,
          item_type: item.itemType,
          scope: item.scope,
          body: item.body,
          status: item.status,
          author_id: isUuid(input.actorId) ? input.actorId : null,
          author_name: item.authorName,
          anonymous: item.anonymous,
        }),
      );
    }
  }

  return { ok: true, review: sanitizeReviewForAnonymity(review) };
}

export async function addReviewItem(input: {
  reviewId: string;
  itemType: 'review' | 'suggestion' | 'comment';
  scope?: string;
  body: string;
  anonymous: boolean;
  actorId: string;
  actorName: string;
  supabase?: SupabaseClient | null;
}): Promise<ReviewItemRecord | null> {
  const review = w2State.reviews.get(input.reviewId);
  if (!review) return null;

  const now = new Date().toISOString();
  const isAnon = input.anonymous || review.anonymous;
  const item: ReviewItemRecord = {
    id: makeId('ri'),
    reviewId: review.id,
    itemType: input.itemType,
    scope: input.scope ?? review.scope,
    body: input.body,
    status: 'open',
    authorId: input.actorId,
    authorName: isAnon ? 'Anonymous reviewer' : input.actorName,
    anonymous: isAnon,
    createdAt: now,
    updatedAt: now,
  };
  review.items.push(item);
  review.updatedAt = now;
  w2State.reviews.set(review.id, review);

  if (input.supabase) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_review_items').insert({
        id: item.id,
        review_id: review.id,
        item_type: item.itemType,
        scope: item.scope,
        body: item.body,
        status: item.status,
        author_id: isUuid(input.actorId) ? input.actorId : null,
        author_name: item.authorName,
        anonymous: item.anonymous,
      }),
    );
  }

  return sanitizeReviewItemForAnonymity(item);
}

export async function updateReviewItemStatus(input: {
  reviewId: string;
  itemId: string;
  status: ReviewItemRecord['status'];
  supabase?: SupabaseClient | null;
}): Promise<ReviewItemRecord | null> {
  const review = w2State.reviews.get(input.reviewId);
  if (!review) return null;
  const idx = review.items.findIndex((i) => i.id === input.itemId);
  if (idx < 0) return null;

  const now = new Date().toISOString();
  review.items[idx] = { ...review.items[idx], status: input.status, updatedAt: now };
  review.updatedAt = now;
  w2State.reviews.set(review.id, review);

  if (input.supabase) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb
        .from('v34_review_items')
        .update({ status: input.status, updated_at: now })
        .eq('id', input.itemId),
    );
  }

  return sanitizeReviewItemForAnonymity(review.items[idx]);
}

export async function addReviewRebuttal(input: {
  reviewId: string;
  reviewItemIds: string[];
  body: string;
  actorId: string;
  actorName: string;
  supabase?: SupabaseClient | null;
}): Promise<{ ok: true; rebuttal: ReviewRebuttalRecord } | { ok: false; status: 400 | 404; message: string }> {
  const review = w2State.reviews.get(input.reviewId);
  if (!review) return { ok: false, status: 404, message: 'Formal review not found.' };

  // §6 invariant: rebuttal MUST reference valid review items in this review.
  const validItemIds = new Set(review.items.map((i) => i.id));
  const matched = input.reviewItemIds.filter((id) => validItemIds.has(id));
  if (matched.length === 0) {
    return {
      ok: false,
      status: 400,
      message: 'A rebuttal must link to at least one existing review item in this formal review.',
    };
  }

  const now = new Date().toISOString();
  const rebuttal: ReviewRebuttalRecord = {
    id: makeId('reb'),
    reviewId: review.id,
    reviewItemIds: matched,
    authorId: input.actorId,
    authorName: input.actorName,
    body: input.body,
    createdAt: now,
  };
  review.rebuttals.push(rebuttal);
  review.updatedAt = now;
  w2State.reviews.set(review.id, review);

  if (input.supabase) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_review_rebuttals').insert({
        id: rebuttal.id,
        review_id: review.id,
        review_item_ids: rebuttal.reviewItemIds,
        author_id: isUuid(input.actorId) ? input.actorId : null,
        author_name: rebuttal.authorName,
        body: rebuttal.body,
      }),
    );
  }

  return { ok: true, rebuttal };
}

export async function recordReviewDecision(input: {
  reviewId: string;
  outcome: ReviewDecisionOutcome;
  rationale: string;
  actorId: string;
  actorName: string;
  supabase?: SupabaseClient | null;
}): Promise<{ ok: true; decision: ReviewDecisionRecord; review: FormalReviewRecord } | { ok: false; status: 404; message: string }> {
  const review = w2State.reviews.get(input.reviewId);
  if (!review) return { ok: false, status: 404, message: 'Formal review not found.' };

  const now = new Date().toISOString();
  const decision: ReviewDecisionRecord = {
    id: makeId('dec'),
    reviewId: review.id,
    outcome: input.outcome,
    rationale: input.rationale,
    decidedBy: input.actorId,
    decidedByName: input.actorName,
    createdAt: now,
  };
  review.decisions.push(decision);
  review.recommendation = input.outcome;
  review.status = 'RESOLVED';
  review.updatedAt = now;
  w2State.reviews.set(review.id, review);

  if (input.supabase) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_review_decisions').insert({
        id: decision.id,
        review_id: review.id,
        outcome: decision.outcome,
        rationale: decision.rationale,
        decided_by: isUuid(input.actorId) ? input.actorId : null,
        decided_by_name: decision.decidedByName,
      }),
    );
    await runSupabaseMutation(input.supabase, (sb) =>
      sb
        .from('v34_reviews')
        .update({ status: 'RESOLVED', recommendation: input.outcome, updated_at: now })
        .eq('id', review.id),
    );
  }

  return { ok: true, decision, review: sanitizeReviewForAnonymity(review) };
}

// ── Part V §6.2 & §6.9: Workspace lookup/update + Formal Review update & submit ──

export function getWorkspaceById(idOrSlug: string): WorkspaceRecord | null {
  const direct = w2State.workspaces.get(idOrSlug);
  if (direct) return direct;
  const norm = idOrSlug.trim().toLowerCase();
  for (const ws of w2State.workspaces.values()) {
    if (ws.slug.toLowerCase() === norm || ws.id.toLowerCase() === norm) {
      return ws;
    }
  }
  return null;
}

export async function updateWorkspace(input: {
  workspaceId: string;
  name?: string;
  description?: string;
  visibility?: 'private' | 'workspace' | 'public';
  supabase?: SupabaseClient | null;
}): Promise<{ ok: true; workspace: WorkspaceRecord } | { ok: false; status: 404; message: string }> {
  const existing = w2State.workspaces.get(input.workspaceId);
  if (!existing) return { ok: false, status: 404, message: 'Workspace not found.' };

  const now = new Date().toISOString();
  const updated: WorkspaceRecord = {
    ...existing,
    name: input.name ?? existing.name,
    description: input.description !== undefined ? input.description : existing.description,
    visibility: input.visibility ?? existing.visibility,
    updatedAt: now,
  };
  w2State.workspaces.set(updated.id, updated);

  if (input.supabase) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb
        .from('v34_workspaces')
        .update({
          name: updated.name,
          description: updated.description,
          visibility: updated.visibility,
          updated_at: now,
        })
        .eq('id', updated.id),
    );
  }
  return { ok: true, workspace: updated };
}

export async function updateFormalReview(input: {
  reviewId: string;
  scope?: string;
  status?: FormalReviewRecord['status'];
  dueAt?: string | null;
  supabase?: SupabaseClient | null;
}): Promise<{ ok: true; review: FormalReviewRecord } | { ok: false; status: 404; message: string }> {
  const existing = w2State.reviews.get(input.reviewId);
  if (!existing) return { ok: false, status: 404, message: 'Formal review not found.' };

  const now = new Date().toISOString();
  const updated: FormalReviewRecord = {
    ...existing,
    scope: input.scope ?? existing.scope,
    status: input.status ?? existing.status,
    dueAt: input.dueAt !== undefined ? input.dueAt : existing.dueAt,
    updatedAt: now,
  };
  w2State.reviews.set(updated.id, updated);

  if (input.supabase) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb
        .from('v34_reviews')
        .update({
          scope: updated.scope,
          status: updated.status,
          due_at: updated.dueAt,
          updated_at: now,
        })
        .eq('id', updated.id),
    );
  }
  return { ok: true, review: sanitizeReviewForAnonymity(updated) };
}

export async function submitFormalReview(input: {
  reviewId: string;
  recommendation: ReviewDecisionOutcome;
  summary: string;
  actorId: string;
  actorName: string;
  supabase?: SupabaseClient | null;
}): Promise<{ ok: true; review: FormalReviewRecord } | { ok: false; status: 404; message: string }> {
  const existing = w2State.reviews.get(input.reviewId);
  if (!existing) return { ok: false, status: 404, message: 'Formal review not found.' };

  const now = new Date().toISOString();
  const summaryItem: ReviewItemRecord = {
    id: makeId('ri'),
    reviewId: existing.id,
    itemType: 'review',
    scope: 'final-recommendation',
    body: input.summary,
    status: 'open',
    authorId: input.actorId,
    authorName: existing.anonymous ? 'Anonymous reviewer' : input.actorName,
    anonymous: existing.anonymous,
    createdAt: now,
    updatedAt: now,
  };

  existing.items.push(summaryItem);
  existing.recommendation = input.recommendation;
  existing.status = 'SUBMITTED';
  existing.updatedAt = now;
  w2State.reviews.set(existing.id, existing);

  if (input.supabase) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_review_items').insert({
        id: summaryItem.id,
        review_id: existing.id,
        item_type: summaryItem.itemType,
        scope: summaryItem.scope,
        body: summaryItem.body,
        status: summaryItem.status,
        author_id: isUuid(input.actorId) ? input.actorId : null,
        author_name: summaryItem.authorName,
        anonymous: summaryItem.anonymous,
      }),
    );
    await runSupabaseMutation(input.supabase, (sb) =>
      sb
        .from('v34_reviews')
        .update({
          status: 'SUBMITTED',
          recommendation: input.recommendation,
          updated_at: now,
        })
        .eq('id', existing.id),
    );
  }

  return { ok: true, review: sanitizeReviewForAnonymity(existing) };
}

