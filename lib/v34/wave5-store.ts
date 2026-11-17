/**
 * ResearchWithME v3.4 Wave 5 Dual-Mode Repository (`lib/v34/wave5-store.ts`).
 *
 * Implements the remaining Part VI §12–13 & Part VII §1–4 canonical entities:
 *  - First-class Topics & FK-backed TopicAssignments
 *  - WorkspaceTool access links to deduplicated global ToolRepository
 *  - Saved Searches & Search Alerts
 *  - Citation Collections & single-target CitationCollectionItems (+ BibTeX export)
 *  - Rebuildable GraphNode / GraphEdge Read Projection (`rebuildGraphProjection`)
 *  - Event-derived Goal Progress Events & Pause/Resume/Archive lifecycle
 */
import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { slugify } from '@/lib/validation';
import {
  getClaimEvidenceLinks,
  listClaims,
  listContributions,
  listEvidence,
  listResearchGoals,
  listSources,
  type ResearchGoalRecord,
} from './store';
import {
  getOptionalPublicSupabase,
  isUuid,
  runSupabaseMutation,
  runSupabaseQuery,
} from './supabase-sync';
import { listWorkspaceMembers } from './wave2-store';
import { listToolRepositories } from './wave3-store';
import type {
  AlertCadence,
  CollectionVisibility,
  TopicTargetType,
} from './wave5-contracts';

export type { AlertCadence, CollectionVisibility, TopicTargetType };

function isWorkspaceMember(workspaceId: string, userId: string): boolean {
  return listWorkspaceMembers(workspaceId).some(
    (m) => m.userId === userId && m.status === 'ACTIVE',
  );
}

// ── Record Interfaces ──────────────────────────────────────────────────────

export interface TopicRecord {
  id: string;
  slug: string;
  name: string;
  description: string;
  parentTopicId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TopicAssignmentRecord {
  id: string;
  topicId: string;
  targetType: TopicTargetType;
  targetId: string;
  assignedBy: string | null;
  createdAt: string;
}

export interface TopicWithCounts extends TopicRecord {
  assignmentCount: number;
  assignments: TopicAssignmentRecord[];
}

export interface WorkspaceToolRecord {
  workspaceId: string;
  toolRepositoryId: string;
  pinned: boolean;
  notes: string;
  addedBy: string | null;
  createdAt: string;
}

export interface SavedSearchRecord {
  id: string;
  userId: string;
  name: string;
  query: string;
  filters: Record<string, unknown>;
  alertCadence: AlertCadence;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CitationCollectionItemRecord {
  id: string;
  collectionId: string;
  sourceId: string | null;
  contributionId: string | null;
  evidenceId: string | null;
  note: string;
  position: number;
  createdAt: string;
}

export interface CitationCollectionRecord {
  id: string;
  userId: string;
  workspaceId: string | null;
  name: string;
  description: string;
  visibility: CollectionVisibility;
  items: CitationCollectionItemRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface GraphNodeProjection {
  id: string;
  nodeType: 'source' | 'evidence' | 'claim' | 'contribution' | 'tool' | 'topic';
  canonicalId: string;
  title: string;
  integrityStatus: string;
  rebuiltAt: string;
}

export interface GraphEdgeProjection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  relationType: string;
  status: 'PROPOSED' | 'ACCEPTED' | 'REJECTED';
  confidence: number | null;
  inferred: boolean;
  rebuiltAt: string;
}

export interface GraphProjectionSnapshot {
  nodes: GraphNodeProjection[];
  edges: GraphEdgeProjection[];
  rebuiltAt: string;
  rebuildDurationMs: number;
  canonicalCounts: {
    sources: number;
    evidence: number;
    claims: number;
    contributions: number;
    tools: number;
    topics: number;
  };
}

export interface GoalProgressEventRecord {
  id: string;
  goalId: string;
  userId: string;
  delta: number;
  sourceKind: string;
  objectType: string | null;
  objectId: string | null;
  note: string;
  createdAt: string;
}

// ── State Container & Seeding ──────────────────────────────────────────────

interface Wave5State {
  topics: Map<string, TopicRecord>;
  topicAssignments: Map<string, TopicAssignmentRecord>;
  workspaceTools: Map<string, WorkspaceToolRecord[]>;
  savedSearches: Map<string, SavedSearchRecord[]>;
  citationCollections: Map<string, CitationCollectionRecord[]>;
  goalProgressEvents: Map<string, GoalProgressEventRecord[]>;
  goalStatusOverrides: Map<
    string,
    {
      title?: string;
      targetValue?: number;
      currentValue?: number;
      dueAt?: string | null;
      status?: ResearchGoalRecord['status'];
      pausedAt?: string | null;
      archivedAt?: string | null;
      updatedAt: string;
    }
  >;
  graphProjection: GraphProjectionSnapshot | null;
}

function makeId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(6).toString('hex')}`;
}

function createSeedWave5State(): Wave5State {
  const now = '2026-11-16T12:00:00.000Z';

  const topics = new Map<string, TopicRecord>([
    [
      'topic-reasoning-models',
      {
        id: 'topic-reasoning-models',
        slug: 'reasoning-models',
        name: 'Reasoning Models',
        description:
          'Reinforcement learning, chain-of-thought verification, and cold-start SFT dynamics for frontier language models.',
        parentTopicId: 'topic-machine-learning',
        createdAt: now,
        updatedAt: now,
      },
    ],
    [
      'topic-machine-learning',
      {
        id: 'topic-machine-learning',
        slug: 'machine-learning',
        name: 'Machine Learning',
        description:
          'Empirical ML architectures, optimization methods, generalization audits, and open benchmark evaluations.',
        parentTopicId: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
    [
      'topic-llm-inference',
      {
        id: 'topic-llm-inference',
        slug: 'llm-inference',
        name: 'LLM Inference',
        description:
          'PagedAttention, KV-cache quantization, speculative decoding, and serving throughput benchmarks.',
        parentTopicId: 'topic-systems',
        createdAt: now,
        updatedAt: now,
      },
    ],
    [
      'topic-systems',
      {
        id: 'topic-systems',
        slug: 'systems',
        name: 'Systems',
        description:
          'Distributed training systems, GPU memory scheduling, and reproducible infrastructure engineering.',
        parentTopicId: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
    [
      'topic-reproducibility',
      {
        id: 'topic-reproducibility',
        slug: 'reproducibility',
        name: 'Reproducibility',
        description:
          'Independent replication reports, ablation verification, and negative-result documentation.',
        parentTopicId: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
    [
      'topic-open-source-tools',
      {
        id: 'topic-open-source-tools',
        slug: 'open-source-tools',
        name: 'Open-Source Tools',
        description:
          'Audited scientific software repositories linked to pinned, citable software release snapshots.',
        parentTopicId: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
  ]);

  const topicAssignments = new Map<string, TopicAssignmentRecord>([
    [
      'ta-seed-1',
      {
        id: 'ta-seed-1',
        topicId: 'topic-reasoning-models',
        targetType: 'contribution',
        targetId: 'contrib-rl-cold-start',
        assignedBy: null,
        createdAt: now,
      },
    ],
    [
      'ta-seed-2',
      {
        id: 'ta-seed-2',
        topicId: 'topic-reproducibility',
        targetType: 'contribution',
        targetId: 'contrib-rl-cold-start',
        assignedBy: null,
        createdAt: now,
      },
    ],
    [
      'ta-seed-3',
      {
        id: 'ta-seed-3',
        topicId: 'topic-llm-inference',
        targetType: 'tool',
        targetId: 'tool-vllm',
        assignedBy: null,
        createdAt: now,
      },
    ],
    [
      'ta-seed-4',
      {
        id: 'ta-seed-4',
        topicId: 'topic-open-source-tools',
        targetType: 'tool',
        targetId: 'tool-open-r1',
        assignedBy: null,
        createdAt: now,
      },
    ],
    [
      'ta-seed-5',
      {
        id: 'ta-seed-5',
        topicId: 'topic-reasoning-models',
        targetType: 'source',
        targetId: 'src-arxiv-2501-12948',
        assignedBy: null,
        createdAt: now,
      },
    ],
  ]);

  const workspaceTools = new Map<string, WorkspaceToolRecord[]>([
    [
      'ws-open-reasoning',
      [
        {
          workspaceId: 'ws-open-reasoning',
          toolRepositoryId: 'tool-vllm',
          pinned: true,
          notes: 'Primary inference server for long-context evaluation runs.',
          addedBy: null,
          createdAt: now,
        },
        {
          workspaceId: 'ws-open-reasoning',
          toolRepositoryId: 'tool-open-r1',
          pinned: true,
          notes: 'Reference GRPO replication harness for reasoning checkpoints.',
          addedBy: null,
          createdAt: now,
        },
      ],
    ],
  ]);

  const savedSearches = new Map<string, SavedSearchRecord[]>([
    [
      'default',
      [
        {
          id: 'ss-seed-1',
          userId: 'default',
          name: 'Cold-start SFT & GRPO Replications',
          query: 'cold-start GRPO reasoning',
          filters: { topic: 'reasoning-models' },
          alertCadence: 'weekly',
          lastRunAt: now,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'ss-seed-2',
          userId: 'default',
          name: 'KV-Cache Serving Benchmarks',
          query: 'PagedAttention throughput',
          filters: { topic: 'llm-inference' },
          alertCadence: 'off',
          lastRunAt: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    ],
  ]);

  const citationCollections = new Map<string, CitationCollectionRecord[]>([
    [
      'default',
      [
        {
          id: 'cc-seed-1',
          userId: 'default',
          workspaceId: 'ws-open-reasoning',
          name: 'Reasoning RL Core Citations',
          description: 'Primary papers and software releases cited across the cold-start replication study.',
          visibility: 'workspace',
          items: [
            {
              id: 'cci-seed-1',
              collectionId: 'cc-seed-1',
              sourceId: 'src-arxiv-2501-12948',
              contributionId: null,
              evidenceId: null,
              note: 'Primary DeepSeek-R1 technical report.',
              position: 0,
              createdAt: now,
            },
            {
              id: 'cci-seed-2',
              collectionId: 'cc-seed-1',
              sourceId: 'src-github-vllm',
              contributionId: null,
              evidenceId: null,
              note: 'Pinned vLLM v0.6.4 evaluation runtime release.',
              position: 1,
              createdAt: now,
            },
          ],
          createdAt: now,
          updatedAt: now,
        },
      ],
    ],
  ]);

  const goalProgressEvents = new Map<string, GoalProgressEventRecord[]>([
    [
      'goal-weekly-sources',
      [
        {
          id: 'gpe-seed-1',
          goalId: 'goal-weekly-sources',
          userId: 'default',
          delta: 1,
          sourceKind: 'source-reviewed',
          objectType: 'source',
          objectId: 'src-arxiv-2501-12948',
          note: 'Completed structured evidence audit of DeepSeek-R1 Table 2.',
          createdAt: now,
        },
      ],
    ],
  ]);

  return {
    topics,
    topicAssignments,
    workspaceTools,
    savedSearches,
    citationCollections,
    goalProgressEvents,
    goalStatusOverrides: new Map(),
    graphProjection: null,
  };
}

let w5State: Wave5State = createSeedWave5State();

export function resetWave5StoreForTesting() {
  w5State = createSeedWave5State();
}

function ensureUserBucket<T>(map: Map<string, T[]>, userId: string): T[] {
  let list = map.get(userId);
  if (!list) {
    const seed = map.get('default') ?? [];
    list = seed.map((item) => structuredClone(item));
    map.set(userId, list);
  }
  return list;
}

// ── 1. Topics & FK-backed Assignments ──────────────────────────────────────

export async function listTopics(): Promise<TopicWithCounts[]> {
  const remote = await runSupabaseQuery<Record<string, unknown>[]>(
    getOptionalPublicSupabase(),
    (sb) => sb.from('v34_topics').select('*').order('name', { ascending: true }).limit(100),
  );
  if (remote) {
    for (const row of remote) {
      const id = String(row.id);
      if (!w5State.topics.has(id)) {
        w5State.topics.set(id, {
          id,
          slug: String(row.slug),
          name: String(row.name),
          description: String(row.description ?? ''),
          parentTopicId: row.parent_topic_id ? String(row.parent_topic_id) : null,
          createdAt: String(row.created_at ?? new Date().toISOString()),
          updatedAt: String(row.updated_at ?? new Date().toISOString()),
        });
      }
    }
  }

  const assignmentsByTopic = new Map<string, TopicAssignmentRecord[]>();
  for (const a of w5State.topicAssignments.values()) {
    const bucket = assignmentsByTopic.get(a.topicId) ?? [];
    bucket.push(a);
    assignmentsByTopic.set(a.topicId, bucket);
  }

  return [...w5State.topics.values()]
    .map((topic) => {
      const assignments = assignmentsByTopic.get(topic.id) ?? [];
      return {
        ...topic,
        assignmentCount: assignments.length,
        assignments,
      };
    })
    .sort((a, b) => b.assignmentCount - a.assignmentCount || a.name.localeCompare(b.name));
}

export async function createTopic(input: {
  name: string;
  slug?: string;
  description: string;
  parentTopicId?: string | null;
  actorId: string;
  supabase?: SupabaseClient | null;
}): Promise<{ topic: TopicRecord; created: boolean }> {
  const normalizedSlug = slugify(input.slug || input.name);
  const existing = [...w5State.topics.values()].find((t) => t.slug === normalizedSlug);
  if (existing) {
    return { topic: existing, created: false };
  }

  const now = new Date().toISOString();
  const topic: TopicRecord = {
    id: `topic-${normalizedSlug}`,
    slug: normalizedSlug,
    name: input.name.trim(),
    description: input.description.trim(),
    parentTopicId: input.parentTopicId ?? null,
    createdAt: now,
    updatedAt: now,
  };
  w5State.topics.set(topic.id, topic);

  if (input.supabase) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_topics').insert({
        id: topic.id,
        slug: topic.slug,
        name: topic.name,
        description: topic.description,
        parent_topic_id: topic.parentTopicId,
        created_by: isUuid(input.actorId) ? input.actorId : null,
      }),
    );
  }
  return { topic, created: true };
}

export async function assignTopicToTarget(input: {
  topicId: string;
  targetType: TopicTargetType;
  targetId: string;
  actorId: string;
  supabase?: SupabaseClient | null;
}): Promise<{ ok: true; assignment: TopicAssignmentRecord } | { ok: false; status: 404; message: string }> {
  const topic =
    w5State.topics.get(input.topicId) ??
    [...w5State.topics.values()].find((t) => t.slug === input.topicId);
  if (!topic) {
    return { ok: false, status: 404, message: 'Topic not found in canonical taxonomy.' };
  }

  const duplicate = [...w5State.topicAssignments.values()].find(
    (a) =>
      a.topicId === topic.id &&
      a.targetType === input.targetType &&
      a.targetId === input.targetId,
  );
  if (duplicate) {
    return { ok: true, assignment: duplicate };
  }

  const assignment: TopicAssignmentRecord = {
    id: makeId('ta'),
    topicId: topic.id,
    targetType: input.targetType,
    targetId: input.targetId,
    assignedBy: input.actorId,
    createdAt: new Date().toISOString(),
  };
  w5State.topicAssignments.set(assignment.id, assignment);

  if (input.supabase) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_topic_assignments').insert({
        id: assignment.id,
        topic_id: assignment.topicId,
        target_type: assignment.targetType,
        target_id: assignment.targetId,
        assigned_by: isUuid(input.actorId) ? input.actorId : null,
      }),
    );
  }
  return { ok: true, assignment };
}

// ── 2. WorkspaceTool Access Bridge (Part VII §B.4) ─────────────────────────

export function listWorkspaceTools(workspaceId: string): WorkspaceToolRecord[] {
  return [...(w5State.workspaceTools.get(workspaceId) ?? [])];
}

export async function linkToolToWorkspace(input: {
  workspaceId: string;
  toolRepositoryId: string;
  pinned: boolean;
  notes: string;
  actorId: string;
  supabase?: SupabaseClient | null;
}): Promise<
  | { ok: true; workspaceTool: WorkspaceToolRecord }
  | { ok: false; status: 403 | 404; code: string; message: string }
> {
  if (!isWorkspaceMember(input.workspaceId, input.actorId)) {
    return {
      ok: false,
      status: 403,
      code: 'WORKSPACE_MEMBERSHIP_REQUIRED',
      message: 'Active workspace membership is required to manage WorkspaceTool links.',
    };
  }
  const tools = await listToolRepositories();
  if (!tools.some((t) => t.id === input.toolRepositoryId)) {
    return {
      ok: false,
      status: 404,
      code: 'TOOL_NOT_FOUND',
      message: 'Global ToolRepository not found.',
    };
  }

  const list = w5State.workspaceTools.get(input.workspaceId) ?? [];
  const idx = list.findIndex((wt) => wt.toolRepositoryId === input.toolRepositoryId);
  const record: WorkspaceToolRecord = {
    workspaceId: input.workspaceId,
    toolRepositoryId: input.toolRepositoryId,
    pinned: input.pinned,
    notes: input.notes,
    addedBy: input.actorId,
    createdAt: idx >= 0 ? list[idx].createdAt : new Date().toISOString(),
  };
  if (idx >= 0) list[idx] = record;
  else list.unshift(record);
  w5State.workspaceTools.set(input.workspaceId, list);

  if (input.supabase) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_workspace_tools').upsert({
        workspace_id: record.workspaceId,
        tool_repository_id: record.toolRepositoryId,
        pinned: record.pinned,
        notes: record.notes,
        added_by: isUuid(input.actorId) ? input.actorId : null,
      }),
    );
  }
  return { ok: true, workspaceTool: record };
}

export async function unlinkToolFromWorkspace(input: {
  workspaceId: string;
  toolRepositoryId: string;
  actorId: string;
  supabase?: SupabaseClient | null;
}): Promise<{ ok: true } | { ok: false; status: 403 | 404; code: string; message: string }> {
  if (!isWorkspaceMember(input.workspaceId, input.actorId)) {
    return {
      ok: false,
      status: 403,
      code: 'WORKSPACE_MEMBERSHIP_REQUIRED',
      message: 'Active workspace membership is required to unlink WorkspaceTools.',
    };
  }
  const list = w5State.workspaceTools.get(input.workspaceId) ?? [];
  const next = list.filter((wt) => wt.toolRepositoryId !== input.toolRepositoryId);
  if (next.length === list.length) {
    return { ok: false, status: 404, code: 'WORKSPACE_TOOL_NOT_FOUND', message: 'Link not found.' };
  }
  w5State.workspaceTools.set(input.workspaceId, next);

  if (input.supabase) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb
        .from('v34_workspace_tools')
        .delete()
        .eq('workspace_id', input.workspaceId)
        .eq('tool_repository_id', input.toolRepositoryId),
    );
  }
  return { ok: true };
}

// ── 3. Saved Searches & Alerts ─────────────────────────────────────────────

export function listSavedSearches(userId: string): SavedSearchRecord[] {
  return [...ensureUserBucket(w5State.savedSearches, userId)].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export async function createSavedSearch(input: {
  userId: string;
  name: string;
  query: string;
  filters: Record<string, unknown>;
  alertCadence: AlertCadence;
  supabase?: SupabaseClient | null;
}): Promise<SavedSearchRecord> {
  const list = ensureUserBucket(w5State.savedSearches, input.userId);
  const now = new Date().toISOString();
  const record: SavedSearchRecord = {
    id: makeId('ss'),
    userId: input.userId,
    name: input.name,
    query: input.query,
    filters: input.filters,
    alertCadence: input.alertCadence,
    lastRunAt: null,
    createdAt: now,
    updatedAt: now,
  };
  list.unshift(record);

  if (input.supabase && isUuid(input.userId)) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_saved_searches').insert({
        id: record.id,
        user_id: input.userId,
        name: record.name,
        query: record.query,
        filters: record.filters,
        alert_cadence: record.alertCadence,
      }),
    );
  }
  return record;
}

export async function updateSavedSearch(input: {
  userId: string;
  id: string;
  name?: string;
  query?: string;
  alertCadence?: AlertCadence;
  markRun?: boolean;
  supabase?: SupabaseClient | null;
}): Promise<SavedSearchRecord | null> {
  const list = ensureUserBucket(w5State.savedSearches, input.userId);
  const idx = list.findIndex((s) => s.id === input.id);
  if (idx < 0) return null;

  const now = new Date().toISOString();
  const updated: SavedSearchRecord = {
    ...list[idx],
    name: input.name ?? list[idx].name,
    query: input.query ?? list[idx].query,
    alertCadence: input.alertCadence ?? list[idx].alertCadence,
    lastRunAt: input.markRun ? now : list[idx].lastRunAt,
    updatedAt: now,
  };
  list[idx] = updated;

  if (input.supabase && isUuid(input.userId)) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb
        .from('v34_saved_searches')
        .update({
          name: updated.name,
          query: updated.query,
          alert_cadence: updated.alertCadence,
          last_run_at: updated.lastRunAt,
          updated_at: now,
        })
        .eq('id', updated.id),
    );
  }
  return updated;
}

export async function deleteSavedSearch(input: {
  userId: string;
  id: string;
  supabase?: SupabaseClient | null;
}): Promise<boolean> {
  const list = ensureUserBucket(w5State.savedSearches, input.userId);
  const idx = list.findIndex((s) => s.id === input.id);
  if (idx < 0) return false;
  list.splice(idx, 1);

  if (input.supabase && isUuid(input.userId)) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_saved_searches').delete().eq('id', input.id),
    );
  }
  return true;
}

// ── 4. Citation Collections & Single-Target Items ──────────────────────────

export function listCitationCollections(userId: string): CitationCollectionRecord[] {
  return [...ensureUserBucket(w5State.citationCollections, userId)].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export async function createCitationCollection(input: {
  userId: string;
  workspaceId?: string | null;
  name: string;
  description: string;
  visibility: CollectionVisibility;
  supabase?: SupabaseClient | null;
}): Promise<CitationCollectionRecord> {
  const list = ensureUserBucket(w5State.citationCollections, input.userId);
  const now = new Date().toISOString();
  const collection: CitationCollectionRecord = {
    id: makeId('cc'),
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    name: input.name,
    description: input.description,
    visibility: input.visibility,
    items: [],
    createdAt: now,
    updatedAt: now,
  };
  list.unshift(collection);

  if (input.supabase && isUuid(input.userId)) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_citation_collections').insert({
        id: collection.id,
        user_id: input.userId,
        workspace_id: collection.workspaceId,
        name: collection.name,
        description: collection.description,
        visibility: collection.visibility,
      }),
    );
  }
  return collection;
}

export async function addCitationCollectionItem(input: {
  userId: string;
  collectionId: string;
  sourceId?: string | null;
  contributionId?: string | null;
  evidenceId?: string | null;
  note: string;
  supabase?: SupabaseClient | null;
}): Promise<
  | { ok: true; item: CitationCollectionItemRecord; collection: CitationCollectionRecord }
  | { ok: false; status: 400 | 404; code: string; message: string }
> {
  const targets = [input.sourceId, input.contributionId, input.evidenceId].filter(
    (v) => typeof v === 'string' && v.length > 0,
  );
  if (targets.length !== 1) {
    return {
      ok: false,
      status: 400,
      code: 'EXACTLY_ONE_TARGET_REQUIRED',
      message: 'Citation collection items must target exactly one of sourceId, contributionId, or evidenceId.',
    };
  }

  const list = ensureUserBucket(w5State.citationCollections, input.userId);
  const col = list.find((c) => c.id === input.collectionId);
  if (!col) {
    return { ok: false, status: 404, code: 'COLLECTION_NOT_FOUND', message: 'Citation collection not found.' };
  }

  const now = new Date().toISOString();
  const item: CitationCollectionItemRecord = {
    id: makeId('cci'),
    collectionId: col.id,
    sourceId: input.sourceId || null,
    contributionId: input.contributionId || null,
    evidenceId: input.evidenceId || null,
    note: input.note,
    position: col.items.length,
    createdAt: now,
  };
  col.items.push(item);
  col.updatedAt = now;

  if (input.supabase && isUuid(input.userId)) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_citation_collection_items').insert({
        id: item.id,
        collection_id: item.collectionId,
        source_id: item.sourceId,
        contribution_id: item.contributionId,
        evidence_id: item.evidenceId,
        note: item.note,
        position: item.position,
        added_by: input.userId,
      }),
    );
  }
  return { ok: true, item, collection: col };
}

export async function deleteCitationCollection(input: {
  userId: string;
  id: string;
  supabase?: SupabaseClient | null;
}): Promise<boolean> {
  const list = ensureUserBucket(w5State.citationCollections, input.userId);
  const idx = list.findIndex((c) => c.id === input.id);
  if (idx < 0) return false;
  list.splice(idx, 1);

  if (input.supabase && isUuid(input.userId)) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_citation_collections').delete().eq('id', input.id),
    );
  }
  return true;
}

// ── 5. Rebuildable Graph Read Projection (Part VII §B.8) ───────────────────

/**
 * Drops and deterministically rebuilds `GraphNode` & `GraphEdge` read
 * projections strictly from canonical Sources, Evidence, Claims, Contributions,
 * Global Tools, Topics, and ClaimEvidence links. Zero self-edges allowed.
 */
export async function rebuildGraphProjection(
  supabase?: SupabaseClient | null,
): Promise<GraphProjectionSnapshot> {
  const started = performance.now();
  const rebuiltAt = new Date().toISOString();

  const [sources, tools, topics] = await Promise.all([
    listSources(),
    listToolRepositories(),
    listTopics(),
  ]);
  const evidence = listEvidence();
  const claims = listClaims();
  const contributions = listContributions();
  const claimEvidence = getClaimEvidenceLinks();

  const nodes: GraphNodeProjection[] = [];
  const nodeIds = new Set<string>();
  const addNode = (node: GraphNodeProjection) => {
    if (nodeIds.has(node.id)) return;
    nodeIds.add(node.id);
    nodes.push(node);
  };

  for (const s of sources) {
    addNode({
      id: `source:${s.id}`,
      nodeType: 'source',
      canonicalId: s.id,
      title: s.title,
      integrityStatus: s.integrityStatus,
      rebuiltAt,
    });
  }
  for (const ev of evidence) {
    addNode({
      id: `evidence:${ev.id}`,
      nodeType: 'evidence',
      canonicalId: ev.id,
      title: ev.statement,
      integrityStatus: ev.assessment.sourceIntegrity,
      rebuiltAt,
    });
  }
  for (const cl of claims) {
    addNode({
      id: `claim:${cl.id}`,
      nodeType: 'claim',
      canonicalId: cl.id,
      title: cl.statement,
      integrityStatus: cl.assessment.sourceIntegrity,
      rebuiltAt,
    });
  }
  for (const c of contributions) {
    addNode({
      id: `contribution:${c.id}`,
      nodeType: 'contribution',
      canonicalId: c.id,
      title: c.title,
      integrityStatus: c.trustAssessment.sourceIntegrity,
      rebuiltAt,
    });
  }
  for (const t of tools) {
    addNode({
      id: `tool:${t.id}`,
      nodeType: 'tool',
      canonicalId: t.id,
      title: t.name,
      integrityStatus: 'active',
      rebuiltAt,
    });
  }
  for (const tp of topics) {
    addNode({
      id: `topic:${tp.id}`,
      nodeType: 'topic',
      canonicalId: tp.id,
      title: tp.name,
      integrityStatus: 'active',
      rebuiltAt,
    });
  }

  const edges: GraphEdgeProjection[] = [];
  const edgeKeys = new Set<string>();
  const addEdge = (edge: Omit<GraphEdgeProjection, 'rebuiltAt'>) => {
    if (edge.fromNodeId === edge.toNodeId) return; // Part VII §3: no self graph edge
    if (!nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) return;
    const key = `${edge.fromNodeId}|${edge.relationType}|${edge.toNodeId}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ ...edge, rebuiltAt });
  };

  // Evidence -> Source
  for (const ev of evidence) {
    addEdge({
      id: `edge-ev-src-${ev.id}`,
      fromNodeId: `evidence:${ev.id}`,
      toNodeId: `source:${ev.sourceId}`,
      relationType: 'EXTRACTED_FROM',
      status: 'ACCEPTED',
      confidence: null,
      inferred: false,
    });
  }

  // Canonical ClaimEvidence (SUPPORTS | CONTRADICTS | QUALIFIES)
  for (const link of claimEvidence) {
    addEdge({
      id: `edge-ce-${link.claimId}-${link.evidenceId}-${link.relationship}`,
      fromNodeId: `evidence:${link.evidenceId}`,
      toNodeId: `claim:${link.claimId}`,
      relationType: link.relationship,
      status: link.status,
      confidence: link.confidence ?? null,
      inferred: link.assertionMethod === 'AI_SUGGESTED',
    });
  }

  // Contribution -> Source / Evidence / Claim
  for (const c of contributions) {
    if (c.primarySourceId) {
      addEdge({
        id: `edge-c-src-${c.id}-${c.primarySourceId}`,
        fromNodeId: `contribution:${c.id}`,
        toNodeId: `source:${c.primarySourceId}`,
        relationType: 'CITES_SOURCE',
        status: 'ACCEPTED',
        confidence: null,
        inferred: false,
      });
    }
    for (const evId of c.evidenceIds) {
      addEdge({
        id: `edge-c-ev-${c.id}-${evId}`,
        fromNodeId: `contribution:${c.id}`,
        toNodeId: `evidence:${evId}`,
        relationType: 'USES_EVIDENCE',
        status: 'ACCEPTED',
        confidence: null,
        inferred: false,
      });
    }
    for (const clId of c.claimIds) {
      addEdge({
        id: `edge-c-cl-${c.id}-${clId}`,
        fromNodeId: `contribution:${c.id}`,
        toNodeId: `claim:${clId}`,
        relationType: 'EVALUATES_CLAIM',
        status: 'ACCEPTED',
        confidence: null,
        inferred: false,
      });
    }
  }

  // ToolRepository -> Linked Software Sources
  for (const t of tools) {
    for (const link of t.linkedSources) {
      addEdge({
        id: `edge-tool-src-${t.id}-${link.sourceId}`,
        fromNodeId: `tool:${t.id}`,
        toNodeId: `source:${link.sourceId}`,
        relationType: 'LINKS_SOFTWARE_SOURCE',
        status: 'ACCEPTED',
        confidence: null,
        inferred: false,
      });
    }
  }

  // FK-backed Topic Assignments
  for (const a of w5State.topicAssignments.values()) {
    addEdge({
      id: `edge-ta-${a.id}`,
      fromNodeId: `${a.targetType}:${a.targetId}`,
      toNodeId: `topic:${a.topicId}`,
      relationType: 'TAGGED_WITH_TOPIC',
      status: 'ACCEPTED',
      confidence: null,
      inferred: false,
    });
  }

  const snapshot: GraphProjectionSnapshot = {
    nodes,
    edges,
    rebuiltAt,
    rebuildDurationMs: Math.max(1, Math.round(performance.now() - started)),
    canonicalCounts: {
      sources: sources.length,
      evidence: evidence.length,
      claims: claims.length,
      contributions: contributions.length,
      tools: tools.length,
      topics: topics.length,
    },
  };
  w5State.graphProjection = snapshot;

  // Best-effort live projection upsert when authenticated Supabase client is available
  if (supabase && nodes.length > 0) {
    await runSupabaseMutation(supabase, (sb) =>
      sb.from('v34_graph_nodes').upsert(
        nodes.map((n) => ({
          id: n.id,
          node_type: n.nodeType,
          canonical_id: n.canonicalId,
          title: n.title,
          integrity_status: n.integrityStatus,
          rebuilt_at: n.rebuiltAt,
        })),
      ),
    );
    if (edges.length > 0) {
      await runSupabaseMutation(supabase, (sb) =>
        sb.from('v34_graph_edges').upsert(
          edges.map((e) => ({
            id: e.id,
            from_node_id: e.fromNodeId,
            to_node_id: e.toNodeId,
            relation_type: e.relationType,
            status: e.status,
            confidence: e.confidence,
            inferred: e.inferred,
            rebuilt_at: e.rebuiltAt,
          })),
        ),
      );
    }
  }

  return snapshot;
}

export async function getGraphProjection(): Promise<GraphProjectionSnapshot> {
  if (!w5State.graphProjection) {
    return rebuildGraphProjection();
  }
  return w5State.graphProjection;
}

// ── 6. Research Goal Lifecycle & Event-Derived Progress (§12–§13) ──────────

function hydrateGoalWithOverrides(goal: ResearchGoalRecord): ResearchGoalRecord {
  const ov = w5State.goalStatusOverrides.get(goal.id);
  if (!ov) return goal;
  return {
    ...goal,
    title: ov.title ?? goal.title,
    targetValue: ov.targetValue ?? goal.targetValue,
    currentValue: ov.currentValue ?? goal.currentValue,
    dueAt: ov.dueAt !== undefined ? ov.dueAt : goal.dueAt,
    status: ov.status ?? goal.status,
    updatedAt: ov.updatedAt,
  };
}

export function listHydratedResearchGoals(userId: string): ResearchGoalRecord[] {
  return listResearchGoals(userId).map(hydrateGoalWithOverrides);
}

export function getGoalById(userId: string, goalId: string): ResearchGoalRecord | null {
  const goal = listResearchGoals(userId).find((g) => g.id === goalId);
  return goal ? hydrateGoalWithOverrides(goal) : null;
}

export async function updateGoalDetails(input: {
  userId: string;
  goalId: string;
  title?: string;
  targetValue?: number;
  dueAt?: string | null;
  supabase?: SupabaseClient | null;
}): Promise<ResearchGoalRecord | null> {
  const existing = getGoalById(input.userId, input.goalId);
  if (!existing) return null;

  const now = new Date().toISOString();
  const prev = w5State.goalStatusOverrides.get(existing.id);
  w5State.goalStatusOverrides.set(existing.id, {
    ...prev,
    title: input.title ?? existing.title,
    targetValue: input.targetValue ?? existing.targetValue,
    dueAt: input.dueAt !== undefined ? input.dueAt : existing.dueAt,
    updatedAt: now,
  });

  const updated = hydrateGoalWithOverrides(existing);
  if (input.supabase && isUuid(input.userId)) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb
        .from('v34_research_goals')
        .update({
          title: updated.title,
          target_value: updated.targetValue,
          due_at: updated.dueAt,
          updated_at: now,
        })
        .eq('id', updated.id),
    );
  }
  return updated;
}

export async function transitionGoalLifecycle(input: {
  userId: string;
  goalId: string;
  action: 'pause' | 'resume' | 'archive';
  supabase?: SupabaseClient | null;
}): Promise<
  | { ok: true; goal: ResearchGoalRecord }
  | { ok: false; status: 400 | 404; code: string; message: string }
> {
  const existing = getGoalById(input.userId, input.goalId);
  if (!existing) {
    return { ok: false, status: 404, code: 'GOAL_NOT_FOUND', message: 'Research goal not found.' };
  }

  if (input.action === 'resume' && existing.status === 'ARCHIVED') {
    return {
      ok: false,
      status: 400,
      code: 'GOAL_ARCHIVED',
      message: 'Archived research goals cannot be resumed; create a new goal instead.',
    };
  }

  const nextStatus: ResearchGoalRecord['status'] =
    input.action === 'pause' ? 'PAUSED' : input.action === 'resume' ? 'ACTIVE' : 'ARCHIVED';
  const now = new Date().toISOString();
  const prev = w5State.goalStatusOverrides.get(existing.id);
  w5State.goalStatusOverrides.set(existing.id, {
    ...prev,
    status: nextStatus,
    pausedAt: input.action === 'pause' ? now : input.action === 'resume' ? null : prev?.pausedAt ?? null,
    archivedAt: input.action === 'archive' ? now : prev?.archivedAt ?? null,
    updatedAt: now,
  });

  const updated = hydrateGoalWithOverrides(existing);
  if (input.supabase && isUuid(input.userId)) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb
        .from('v34_research_goals')
        .update({
          status: nextStatus,
          paused_at: input.action === 'pause' ? now : input.action === 'resume' ? null : undefined,
          archived_at: input.action === 'archive' ? now : undefined,
          updated_at: now,
        })
        .eq('id', updated.id),
    );
  }
  return { ok: true, goal: updated };
}

export function listGoalProgressEvents(goalId: string): GoalProgressEventRecord[] {
  return [...(w5State.goalProgressEvents.get(goalId) ?? [])].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function recordGoalProgressEvent(input: {
  userId: string;
  goalId: string;
  delta: number;
  sourceKind: string;
  objectType?: string;
  objectId?: string;
  note: string;
  supabase?: SupabaseClient | null;
}): Promise<
  | { ok: true; event: GoalProgressEventRecord; goal: ResearchGoalRecord }
  | { ok: false; status: 400 | 404; code: string; message: string }
> {
  const existing = getGoalById(input.userId, input.goalId);
  if (!existing) {
    return { ok: false, status: 404, code: 'GOAL_NOT_FOUND', message: 'Research goal not found.' };
  }
  if (existing.status === 'ARCHIVED') {
    return {
      ok: false,
      status: 400,
      code: 'GOAL_ARCHIVED',
      message: 'Cannot record progress against an archived research goal.',
    };
  }

  const now = new Date().toISOString();
  const event: GoalProgressEventRecord = {
    id: makeId('gpe'),
    goalId: existing.id,
    userId: input.userId,
    delta: input.delta,
    sourceKind: input.sourceKind,
    objectType: input.objectType ?? null,
    objectId: input.objectId ?? null,
    note: input.note,
    createdAt: now,
  };
  const list = w5State.goalProgressEvents.get(existing.id) ?? [];
  list.unshift(event);
  w5State.goalProgressEvents.set(existing.id, list);

  const nextValue = existing.currentValue + input.delta;
  const nextStatus: ResearchGoalRecord['status'] =
    nextValue >= existing.targetValue ? 'COMPLETED' : existing.status;

  const prev = w5State.goalStatusOverrides.get(existing.id);
  w5State.goalStatusOverrides.set(existing.id, {
    ...prev,
    currentValue: nextValue,
    status: nextStatus,
    updatedAt: now,
  });

  const updated = hydrateGoalWithOverrides(existing);
  if (input.supabase && isUuid(input.userId)) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_goal_progress_events').insert({
        id: event.id,
        goal_id: event.goalId,
        user_id: input.userId,
        delta: event.delta,
        source_kind: event.sourceKind,
        object_type: event.objectType,
        object_id: event.objectId,
        note: event.note,
      }),
    );
    await runSupabaseMutation(input.supabase, (sb) =>
      sb
        .from('v34_research_goals')
        .update({ current_value: nextValue, status: nextStatus, updated_at: now })
        .eq('id', updated.id),
    );
  }
  return { ok: true, event, goal: updated };
}
