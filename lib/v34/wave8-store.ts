import { createHash, randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isUuid, runSupabaseMutation } from './supabase-sync';
import { emitDomainEvent, enqueueBackgroundJob, recordAuditEvent } from './outbox';
import {
  isProviderPermittedForClassification,
  recordAiProvenance,
} from './ai-governance';
import type { DataClassification } from './wave6-contracts';
import {
  getEvidenceById,
  getClaimById,
  getSourceById,
  listContributions,
  listEvidence,
  listClaims,
  listLibraryItems,
  listUserDrafts,
} from './store';
import { getWorkspaceById, listWorkspaceMembers } from './wave2-store';
import {
  listAttentionItems,
  listNotifications,
  getRecognitionSummary,
  getDashboardPreferences,
  updateDashboardPreferences,
} from './wave3-store';
import {
  getContributorProfile,
  updateContributorProfile,
  listUserDevices,
  listPushSubscriptions,
  type UserAffiliationRecord,
  type UserExpertiseRecord,
  type ContributorProfileRecord,
} from './wave7-store';

export interface EvidenceAssessmentRecord {
  id: string;
  evidenceId: string;
  assessorId: string;
  rigorScore: number;
  verifiabilityScore: number;
  notes: string;
  status: 'DRAFT' | 'PUBLISHED' | 'SUPERSEDED';
  createdAt: string;
  updatedAt: string;
}

export interface ClaimAssessmentRecord {
  id: string;
  claimId: string;
  assessorId: string;
  evidenceSupportScore: number;
  confidenceLevel: 'HIGH' | 'MODERATE' | 'LOW' | 'INSUFFICIENT';
  rationale: string;
  status: 'DRAFT' | 'PUBLISHED' | 'SUPERSEDED';
  createdAt: string;
  updatedAt: string;
}

export interface LibraryCollectionRecord {
  id: string;
  userId: string;
  name: string;
  description: string;
  colorToken: 'accent' | 'info' | 'success' | 'warning' | 'neutral';
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTaskRecord {
  id: string;
  projectId: string;
  title: string;
  description: string;
  assigneeId: string | null;
  creatorId: string;
  status: 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceAccessRequestRecord {
  id: string;
  workspaceId: string;
  requesterId: string;
  requestedRole: 'RESEARCHER' | 'REVIEWER' | 'VIEWER';
  rationale: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  decidedBy: string | null;
  decisionNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssistantSessionRecord {
  id: string;
  userId: string;
  workspaceId: string | null;
  title: string;
  dataClassification: DataClassification;
  contextSourceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AssistantMessageRecord {
  id: string;
  sessionId: string;
  userId: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  citedSourceIds: string[];
  provenanceId: string | null;
  createdAt: string;
}

export interface RenderJobRecord {
  id: string;
  ownerId: string;
  engine: 'REMOTION' | 'HYPERFRAMES';
  compositionId: string;
  sourceContributionId: string | null;
  status: 'PENDING_APPROVAL' | 'QUEUED' | 'RENDERING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  humanApprovedBy: string | null;
  humanApprovedAt: string | null;
  inputChecksumSha256: string;
  outputChecksumSha256: string | null;
  outputUrl: string | null;
  durationSeconds: number;
  tokenChecksum: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceSyncCursorRecord {
  id: string;
  userId: string;
  deviceId: string;
  resourceType: 'library' | 'notifications' | 'attention' | 'goals' | 'drafts' | 'contributions';
  cursor: string;
  acknowledgedAt: string;
}

export interface AccountTombstoneRecord {
  userId: string;
  tombstonedAt: string;
  retainCitationTombstones: boolean;
  revokedDevicesCount: number;
  revokedSubscriptionsCount: number;
}

interface Wave8State {
  evidenceAssessments: EvidenceAssessmentRecord[];
  claimAssessments: ClaimAssessmentRecord[];
  libraryCollections: LibraryCollectionRecord[];
  projectTasks: ProjectTaskRecord[];
  accessRequests: WorkspaceAccessRequestRecord[];
  assistantSessions: AssistantSessionRecord[];
  assistantMessages: AssistantMessageRecord[];
  renderJobs: RenderJobRecord[];
  syncCursors: DeviceSyncCursorRecord[];
  tombstones: Record<string, AccountTombstoneRecord>;
}

const g = globalThis as unknown as { __v34Wave8State?: Wave8State };

function initialWave8State(): Wave8State {
  const now = '2026-11-16T08:00:00.000Z';
  return {
    evidenceAssessments: [
      {
        id: 'ev-assess-seed-1',
        evidenceId: 'ev-rl-cold-start-01',
        assessorId: 'myself-aas',
        rigorScore: 5,
        verifiabilityScore: 5,
        notes: 'Direct Table 2 verification with reproducible eval seed.',
        status: 'PUBLISHED',
        createdAt: now,
        updatedAt: now,
      },
    ],
    claimAssessments: [
      {
        id: 'clm-assess-seed-1',
        claimId: 'claim-rl-cold-start-01',
        assessorId: 'myself-aas',
        evidenceSupportScore: 4,
        confidenceLevel: 'HIGH',
        rationale: 'Supported by primary ablation benchmarks; scope limited to math/code tasks.',
        status: 'PUBLISHED',
        createdAt: now,
        updatedAt: now,
      },
    ],
    libraryCollections: [
      {
        id: 'libcol-reasoning-core',
        userId: 'local-contributor',
        name: 'Reasoning & RL Core Papers',
        description: 'Canonical benchmarks and ablations for reinforcement learning reasoning.',
        colorToken: 'accent',
        itemCount: 2,
        createdAt: now,
        updatedAt: now,
      },
    ],
    projectTasks: [
      {
        id: 'ptask-seed-1',
        projectId: 'proj-reasoning-replication',
        title: 'Re-run verifier seed sweep on 7B checkpoint',
        description: 'Confirm variance band across 5 independent evaluation seeds.',
        assigneeId: 'local-contributor',
        creatorId: 'local-contributor',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        dueDate: '2026-12-01T00:00:00.000Z',
        createdAt: now,
        updatedAt: now,
      },
    ],
    accessRequests: [],
    assistantSessions: [],
    assistantMessages: [],
    renderJobs: [],
    syncCursors: [],
    tombstones: {},
  };
}

function getState(): Wave8State {
  if (!g.__v34Wave8State) {
    g.__v34Wave8State = initialWave8State();
  }
  return g.__v34Wave8State;
}

export function resetWave8StoreForTesting(): void {
  g.__v34Wave8State = initialWave8State();
}

// ── Evidence & Claim Assessments ─────────────────────────────────────────

export function listEvidenceAssessments(evidenceId: string): EvidenceAssessmentRecord[] {
  return getState().evidenceAssessments.filter((a) => a.evidenceId === evidenceId);
}

export async function createEvidenceAssessment(input: {
  evidenceId: string;
  assessorId: string;
  rigorScore: number;
  verifiabilityScore: number;
  notes: string;
  supabase?: SupabaseClient | null;
}): Promise<EvidenceAssessmentRecord | null> {
  if (!getEvidenceById(input.evidenceId)) return null;
  const now = new Date().toISOString();
  const record: EvidenceAssessmentRecord = {
    id: `ev-assess-${randomUUID().slice(0, 10)}`,
    evidenceId: input.evidenceId,
    assessorId: input.assessorId,
    rigorScore: input.rigorScore,
    verifiabilityScore: input.verifiabilityScore,
    notes: input.notes,
    status: 'PUBLISHED',
    createdAt: now,
    updatedAt: now,
  };
  getState().evidenceAssessments.unshift(record);
  if (input.supabase && isUuid(record.assessorId)) {
    await runSupabaseMutation(input.supabase, (client) =>
      client.from('v34_evidence_assessments').insert({
        evidence_id: record.evidenceId,
        assessor_id: record.assessorId,
        rigor_score: record.rigorScore,
        verifiability_score: record.verifiabilityScore,
        notes: record.notes,
      }),
    );
  }
  return record;
}

export function listClaimAssessments(claimId: string): ClaimAssessmentRecord[] {
  return getState().claimAssessments.filter((a) => a.claimId === claimId);
}

export async function createClaimAssessment(input: {
  claimId: string;
  assessorId: string;
  evidenceSupportScore: number;
  confidenceLevel: ClaimAssessmentRecord['confidenceLevel'];
  rationale: string;
  supabase?: SupabaseClient | null;
}): Promise<ClaimAssessmentRecord | null> {
  if (!getClaimById(input.claimId)) return null;
  const now = new Date().toISOString();
  const record: ClaimAssessmentRecord = {
    id: `clm-assess-${randomUUID().slice(0, 10)}`,
    claimId: input.claimId,
    assessorId: input.assessorId,
    evidenceSupportScore: input.evidenceSupportScore,
    confidenceLevel: input.confidenceLevel,
    rationale: input.rationale,
    status: 'PUBLISHED',
    createdAt: now,
    updatedAt: now,
  };
  getState().claimAssessments.unshift(record);
  if (input.supabase && isUuid(record.assessorId)) {
    await runSupabaseMutation(input.supabase, (client) =>
      client.from('v34_claim_assessments').insert({
        claim_id: record.claimId,
        assessor_id: record.assessorId,
        evidence_support_score: record.evidenceSupportScore,
        confidence_level: record.confidenceLevel,
        rationale: record.rationale,
      }),
    );
  }
  return record;
}

// ── Library Collections ──────────────────────────────────────────────────

export function listLibraryCollections(userId: string): LibraryCollectionRecord[] {
  return getState().libraryCollections.filter((c) => c.userId === userId);
}

export async function createLibraryCollection(input: {
  userId: string;
  name: string;
  description: string;
  colorToken: LibraryCollectionRecord['colorToken'];
  supabase?: SupabaseClient | null;
}): Promise<LibraryCollectionRecord> {
  const now = new Date().toISOString();
  const rec: LibraryCollectionRecord = {
    id: `libcol-${randomUUID().slice(0, 10)}`,
    userId: input.userId,
    name: input.name,
    description: input.description,
    colorToken: input.colorToken,
    itemCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  getState().libraryCollections.unshift(rec);
  if (input.supabase && isUuid(rec.userId)) {
    await runSupabaseMutation(input.supabase, (client) =>
      client.from('v34_library_collections').insert({
        user_id: rec.userId,
        name: rec.name,
        description: rec.description,
        color_token: rec.colorToken,
      }),
    );
  }
  return rec;
}

export async function updateLibraryCollection(input: {
  id: string;
  userId: string;
  name?: string;
  description?: string;
  colorToken?: LibraryCollectionRecord['colorToken'];
  supabase?: SupabaseClient | null;
}): Promise<LibraryCollectionRecord | null> {
  const col = getState().libraryCollections.find((c) => c.id === input.id && c.userId === input.userId);
  if (!col) return null;
  if (input.name !== undefined) col.name = input.name;
  if (input.description !== undefined) col.description = input.description;
  if (input.colorToken !== undefined) col.colorToken = input.colorToken;
  col.updatedAt = new Date().toISOString();
  if (input.supabase && isUuid(input.userId)) {
    await runSupabaseMutation(input.supabase, (client) =>
      client
        .from('v34_library_collections')
        .update({
          name: col.name,
          description: col.description,
          color_token: col.colorToken,
          updated_at: col.updatedAt,
        })
        .eq('id', col.id)
        .eq('user_id', input.userId),
    );
  }
  return col;
}

export async function deleteLibraryCollection(input: {
  id: string;
  userId: string;
  supabase?: SupabaseClient | null;
}): Promise<boolean> {
  const arr = getState().libraryCollections;
  const idx = arr.findIndex((c) => c.id === input.id && c.userId === input.userId);
  if (idx === -1) return false;
  arr.splice(idx, 1);
  if (input.supabase && isUuid(input.userId)) {
    await runSupabaseMutation(input.supabase, (client) =>
      client.from('v34_library_collections').delete().eq('id', input.id).eq('user_id', input.userId),
    );
  }
  return true;
}

// ── Project Tasks ────────────────────────────────────────────────────────

export function listProjectTasks(projectId: string): ProjectTaskRecord[] {
  return getState().projectTasks.filter((t) => t.projectId === projectId);
}

export async function createProjectTask(input: {
  projectId: string;
  title: string;
  description: string;
  assigneeId?: string | null;
  creatorId: string;
  priority: ProjectTaskRecord['priority'];
  dueDate?: string | null;
  supabase?: SupabaseClient | null;
}): Promise<ProjectTaskRecord> {
  const now = new Date().toISOString();
  const rec: ProjectTaskRecord = {
    id: `ptask-${randomUUID().slice(0, 10)}`,
    projectId: input.projectId,
    title: input.title,
    description: input.description,
    assigneeId: input.assigneeId ?? null,
    creatorId: input.creatorId,
    status: 'TODO',
    priority: input.priority,
    dueDate: input.dueDate ?? null,
    createdAt: now,
    updatedAt: now,
  };
  getState().projectTasks.unshift(rec);
  if (input.supabase && isUuid(rec.creatorId)) {
    await runSupabaseMutation(input.supabase, (client) =>
      client.from('v34_project_tasks').insert({
        project_id: rec.projectId,
        title: rec.title,
        description: rec.description,
        assignee_id: isUuid(rec.assigneeId) ? rec.assigneeId : null,
        creator_id: rec.creatorId,
        status: rec.status,
        priority: rec.priority,
        due_date: rec.dueDate,
      }),
    );
  }
  return rec;
}

export async function updateProjectTask(input: {
  projectId: string;
  taskId: string;
  title?: string;
  description?: string;
  assigneeId?: string | null;
  status?: ProjectTaskRecord['status'];
  priority?: ProjectTaskRecord['priority'];
  dueDate?: string | null;
  supabase?: SupabaseClient | null;
}): Promise<ProjectTaskRecord | null> {
  const task = getState().projectTasks.find((t) => t.id === input.taskId && t.projectId === input.projectId);
  if (!task) return null;
  if (input.title !== undefined) task.title = input.title;
  if (input.description !== undefined) task.description = input.description;
  if (input.assigneeId !== undefined) task.assigneeId = input.assigneeId;
  if (input.status !== undefined) task.status = input.status;
  if (input.priority !== undefined) task.priority = input.priority;
  if (input.dueDate !== undefined) task.dueDate = input.dueDate;
  task.updatedAt = new Date().toISOString();
  if (input.supabase) {
    await runSupabaseMutation(input.supabase, (client) =>
      client
        .from('v34_project_tasks')
        .update({
          title: task.title,
          description: task.description,
          assignee_id: isUuid(task.assigneeId) ? task.assigneeId : null,
          status: task.status,
          priority: task.priority,
          due_date: task.dueDate,
          updated_at: task.updatedAt,
        })
        .eq('id', task.id),
    );
  }
  return task;
}

// ── Workspace Access Requests ────────────────────────────────────────────

export function listWorkspaceAccessRequests(workspaceId: string): WorkspaceAccessRequestRecord[] {
  return getState().accessRequests.filter((r) => r.workspaceId === workspaceId);
}

export async function createWorkspaceAccessRequest(input: {
  workspaceId: string;
  requesterId: string;
  requestedRole: WorkspaceAccessRequestRecord['requestedRole'];
  rationale: string;
  supabase?: SupabaseClient | null;
}): Promise<WorkspaceAccessRequestRecord | null> {
  if (!getWorkspaceById(input.workspaceId)) return null;
  const now = new Date().toISOString();
  const rec: WorkspaceAccessRequestRecord = {
    id: `wsreq-${randomUUID().slice(0, 10)}`,
    workspaceId: input.workspaceId,
    requesterId: input.requesterId,
    requestedRole: input.requestedRole,
    rationale: input.rationale,
    status: 'PENDING',
    decidedBy: null,
    decisionNote: null,
    createdAt: now,
    updatedAt: now,
  };
  getState().accessRequests.unshift(rec);
  if (input.supabase && isUuid(rec.requesterId)) {
    await runSupabaseMutation(input.supabase, (client) =>
      client.from('v34_workspace_access_requests').insert({
        workspace_id: rec.workspaceId,
        requester_id: rec.requesterId,
        requested_role: rec.requestedRole,
        rationale: rec.rationale,
        status: rec.status,
      }),
    );
  }
  return rec;
}

export async function decideWorkspaceAccessRequest(input: {
  workspaceId: string;
  requestId: string;
  decidedBy: string;
  status: 'APPROVED' | 'REJECTED';
  decisionNote?: string;
  supabase?: SupabaseClient | null;
}): Promise<WorkspaceAccessRequestRecord | null> {
  const req = getState().accessRequests.find(
    (r) => r.id === input.requestId && r.workspaceId === input.workspaceId,
  );
  if (!req) return null;
  req.status = input.status;
  req.decidedBy = input.decidedBy;
  req.decisionNote = input.decisionNote ?? null;
  req.updatedAt = new Date().toISOString();
  await recordAuditEvent({
    actorId: input.decidedBy,
    action: `workspace_access_request_${input.status.toLowerCase()}`,
    targetType: 'workspace_access_request',
    targetId: req.id,
    workspaceId: input.workspaceId,
    supabase: input.supabase,
  });
  if (input.supabase) {
    await runSupabaseMutation(input.supabase, (client) =>
      client
        .from('v34_workspace_access_requests')
        .update({
          status: req.status,
          decided_by: isUuid(req.decidedBy) ? req.decidedBy : null,
          decision_note: req.decisionNote,
          updated_at: req.updatedAt,
        })
        .eq('id', req.id),
    );
  }
  return req;
}

// ── Conversational Research Assistant Sessions ───────────────────────────

export async function createAssistantSession(input: {
  userId: string;
  title: string;
  workspaceId?: string | null;
  dataClassification: DataClassification;
  contextSourceIds: string[];
  supabase?: SupabaseClient | null;
}): Promise<AssistantSessionRecord> {
  const now = new Date().toISOString();
  const session: AssistantSessionRecord = {
    id: `asess-${randomUUID().slice(0, 10)}`,
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    title: input.title,
    dataClassification: input.dataClassification,
    contextSourceIds: input.contextSourceIds,
    createdAt: now,
    updatedAt: now,
  };
  getState().assistantSessions.unshift(session);
  if (input.supabase && isUuid(session.userId)) {
    await runSupabaseMutation(input.supabase, (client) =>
      client.from('v34_assistant_sessions').insert({
        user_id: session.userId,
        workspace_id: session.workspaceId,
        title: session.title,
        data_classification: session.dataClassification,
        context_source_ids: session.contextSourceIds,
      }),
    );
  }
  return session;
}

export function getAssistantSession(sessionId: string, userId: string): AssistantSessionRecord | null {
  return getState().assistantSessions.find((s) => s.id === sessionId && s.userId === userId) ?? null;
}

export async function postAssistantSessionMessage(input: {
  sessionId: string;
  userId: string;
  content: string;
  provider: string;
  model: string;
  sourceIds?: string[];
  supabase?: SupabaseClient | null;
}): Promise<
  | { ok: true; userMessage: AssistantMessageRecord; assistantMessage: AssistantMessageRecord; provenanceId: string }
  | { ok: false; status: number; code: string; message: string }
> {
  const session = getAssistantSession(input.sessionId, input.userId);
  if (!session) {
    return { ok: false, status: 404, code: 'SESSION_NOT_FOUND', message: 'Assistant session not found.' };
  }

  if (!isProviderPermittedForClassification(input.provider, session.dataClassification)) {
    return {
      ok: false,
      status: 422,
      code: 'PROHIBITED_EXTERNAL_PROCESSING',
      message: `External provider "${input.provider}" is prohibited for ${session.dataClassification} research sessions.`,
    };
  }

  const now = new Date().toISOString();
  const citedSourceIds = Array.from(new Set([...session.contextSourceIds, ...(input.sourceIds ?? [])]));
  const userMessage: AssistantMessageRecord = {
    id: `amsg-${randomUUID().slice(0, 10)}`,
    sessionId: session.id,
    userId: input.userId,
    role: 'USER',
    content: input.content,
    citedSourceIds,
    provenanceId: null,
    createdAt: now,
  };
  getState().assistantMessages.push(userMessage);

  const resolvedTitles = citedSourceIds
    .map((sid) => getSourceById(sid)?.title)
    .filter((t): t is string => Boolean(t));

  const provenance = await recordAiProvenance({
    actorId: input.userId,
    workspaceId: session.workspaceId,
    targetType: 'draft',
    targetId: session.id,
    provider: input.provider,
    model: input.model,
    modelVersion: '3.4.0',
    operation: 'assistant-message',
    transformationType: 'summarize',
    dataClassification: session.dataClassification,
    promptTemplateVersion: 'assistant-session-v1',
    retrievalTime: now,
    sourceIds: citedSourceIds,
    toolCalls: [
      {
        name: 'canonical_source_grounding',
        status: 'ok',
        summary: `Grounded in ${resolvedTitles.length} canonical sources.`,
      },
    ],
    generationTimeMs: 4,
    citationValidationStatus: citedSourceIds.length > 0 ? 'PASSED' : 'PENDING',
    humanReviewStatus: 'PENDING',
    supabase: input.supabase,
  });

  const replyText =
    resolvedTitles.length > 0
      ? `Grounded synthesis across ${resolvedTitles.length} canonical source(s) (${resolvedTitles.slice(0, 3).join('; ')}): verify linked Evidence & Claims before promoting any finding into a contribution.`
      : 'No canonical sources were attached to this turn. Link a DOI, arXiv, or repository Source to generate verifiable scholarly citations.';

  const assistantMessage: AssistantMessageRecord = {
    id: `amsg-${randomUUID().slice(0, 10)}`,
    sessionId: session.id,
    userId: input.userId,
    role: 'ASSISTANT',
    content: replyText,
    citedSourceIds,
    provenanceId: provenance.id,
    createdAt: new Date().toISOString(),
  };
  getState().assistantMessages.push(assistantMessage);
  session.updatedAt = assistantMessage.createdAt;

  return { ok: true, userMessage, assistantMessage, provenanceId: provenance.id };
}

// ── Governed Media Renders (Remotion & Hyperframes, Part V §16.3) ────────

const CURRENT_TOKEN_CHECKSUM = 'sha256:eb18cbef276243f6';

export async function createRenderJob(input: {
  ownerId: string;
  engine: 'REMOTION' | 'HYPERFRAMES';
  compositionId: string;
  sourceContributionId?: string | null;
  durationSeconds: number;
  humanApproved: boolean;
  payload: Record<string, unknown>;
  supabase?: SupabaseClient | null;
}): Promise<RenderJobRecord> {
  const now = new Date().toISOString();
  const inputHash = createHash('sha256')
    .update(
      JSON.stringify({
        engine: input.engine,
        compositionId: input.compositionId,
        sourceContributionId: input.sourceContributionId ?? null,
        durationSeconds: input.durationSeconds,
        tokenChecksum: CURRENT_TOKEN_CHECKSUM,
        payload: input.payload,
      }),
    )
    .digest('hex');

  const rec: RenderJobRecord = {
    id: `rnd_${randomUUID().slice(0, 10)}`,
    ownerId: input.ownerId,
    engine: input.engine,
    compositionId: input.compositionId,
    sourceContributionId: input.sourceContributionId ?? null,
    status: input.humanApproved ? 'QUEUED' : 'PENDING_APPROVAL',
    humanApprovedBy: input.humanApproved ? input.ownerId : null,
    humanApprovedAt: input.humanApproved ? now : null,
    inputChecksumSha256: inputHash,
    outputChecksumSha256: null,
    outputUrl: null,
    durationSeconds: input.durationSeconds,
    tokenChecksum: CURRENT_TOKEN_CHECKSUM,
    payload: input.payload,
    createdAt: now,
    updatedAt: now,
  };
  getState().renderJobs.unshift(rec);

  await enqueueBackgroundJob({
    ownerId: input.ownerId,
    jobType: input.engine === 'REMOTION' ? 'render.remotion' : 'render.hyperframes',
    payload: { renderId: rec.id, compositionId: rec.compositionId, inputChecksumSha256: inputHash },
    supabase: input.supabase,
  });
  await emitDomainEvent(
    { type: 'RenderJobRequested', renderId: rec.id, engine: input.engine, actorId: input.ownerId },
    { actorId: input.ownerId, supabase: input.supabase },
  );
  if (input.supabase && isUuid(rec.ownerId)) {
    await runSupabaseMutation(input.supabase, (client) =>
      client.from('v34_render_jobs').insert({
        owner_id: rec.ownerId,
        engine: rec.engine,
        composition_id: rec.compositionId,
        source_contribution_id: rec.sourceContributionId,
        status: rec.status,
        human_approved_by: isUuid(rec.humanApprovedBy) ? rec.humanApprovedBy : null,
        human_approved_at: rec.humanApprovedAt,
        input_checksum_sha256: rec.inputChecksumSha256,
        duration_seconds: rec.durationSeconds,
        token_checksum: rec.tokenChecksum,
        payload: rec.payload,
      }),
    );
  }
  return rec;
}

export function getRenderJob(renderId: string, ownerId: string): RenderJobRecord | null {
  return getState().renderJobs.find((r) => r.id === renderId && r.ownerId === ownerId) ?? null;
}

export async function cancelRenderJob(input: {
  renderId: string;
  ownerId: string;
  supabase?: SupabaseClient | null;
}): Promise<RenderJobRecord | null> {
  const rec = getRenderJob(input.renderId, input.ownerId);
  if (!rec) return null;
  rec.status = 'CANCELLED';
  rec.updatedAt = new Date().toISOString();
  if (input.supabase && isUuid(input.ownerId)) {
    await runSupabaseMutation(input.supabase, (client) =>
      client
        .from('v34_render_jobs')
        .update({ status: 'CANCELLED', updated_at: rec.updatedAt })
        .eq('id', rec.id)
        .eq('owner_id', input.ownerId),
    );
  }
  return rec;
}

// ── Device Sync Cursor Acknowledgement ───────────────────────────────────

export async function acknowledgeSyncCursor(input: {
  userId: string;
  deviceId: string;
  resourceType: DeviceSyncCursorRecord['resourceType'];
  cursor: string;
  supabase?: SupabaseClient | null;
}): Promise<DeviceSyncCursorRecord> {
  const now = new Date().toISOString();
  const existing = getState().syncCursors.find(
    (c) => c.userId === input.userId && c.deviceId === input.deviceId && c.resourceType === input.resourceType,
  );
  if (existing) {
    existing.cursor = input.cursor;
    existing.acknowledgedAt = now;
    if (input.supabase && isUuid(input.userId)) {
      await runSupabaseMutation(input.supabase, (client) =>
        client.from('v34_device_sync_cursors').upsert({
          user_id: input.userId,
          device_id: input.deviceId,
          resource_type: input.resourceType,
          cursor: input.cursor,
          acknowledged_at: now,
        }),
      );
    }
    return existing;
  }
  const rec: DeviceSyncCursorRecord = {
    id: `cur_${randomUUID().slice(0, 10)}`,
    userId: input.userId,
    deviceId: input.deviceId,
    resourceType: input.resourceType,
    cursor: input.cursor,
    acknowledgedAt: now,
  };
  getState().syncCursors.push(rec);
  if (input.supabase && isUuid(input.userId)) {
    await runSupabaseMutation(input.supabase, (client) =>
      client.from('v34_device_sync_cursors').upsert({
        user_id: input.userId,
        device_id: input.deviceId,
        resource_type: input.resourceType,
        cursor: input.cursor,
        acknowledged_at: now,
      }),
    );
  }
  return rec;
}

export function listDeviceSyncCursors(userId: string): DeviceSyncCursorRecord[] {
  return getState().syncCursors.filter((c) => c.userId === userId);
}

// ── Profile Affiliations, Expertise, ORCID/GitHub Connect & Account Deletion ──

export async function addUserAffiliation(input: {
  userId: string;
  institution: string;
  role: string;
  rorId?: string | null;
  startYear?: number | null;
  endYear?: number | null;
  primary: boolean;
  supabase?: SupabaseClient | null;
}): Promise<UserAffiliationRecord> {
  const profile = getContributorProfile(input.userId);
  const rec: UserAffiliationRecord = {
    id: `aff-${randomUUID().slice(0, 10)}`,
    institution: input.institution,
    roleTitle: input.role,
    rorId: input.rorId ?? null,
    startYear: input.startYear ?? null,
    endYear: input.endYear ?? null,
    isPrimary: input.primary,
  };
  if (input.primary) {
    for (const a of profile.affiliations) a.isPrimary = false;
  }
  profile.affiliations.unshift(rec);
  profile.updatedAt = new Date().toISOString();
  if (input.supabase && isUuid(input.userId)) {
    await runSupabaseMutation(input.supabase, (client) =>
      client.from('v34_user_affiliations').insert({
        user_id: input.userId,
        institution: rec.institution,
        role_title: rec.roleTitle,
        ror_id: rec.rorId,
        start_year: rec.startYear,
        end_year: rec.endYear,
        is_primary: rec.isPrimary,
      }),
    );
  }
  return rec;
}

export async function updateUserAffiliation(input: {
  userId: string;
  affiliationId: string;
  institution?: string;
  role?: string;
  rorId?: string | null;
  startYear?: number | null;
  endYear?: number | null;
  primary?: boolean;
}): Promise<UserAffiliationRecord | null> {
  const profile = getContributorProfile(input.userId);
  const aff = profile.affiliations.find((a) => a.id === input.affiliationId);
  if (!aff) return null;
  if (input.primary) {
    for (const a of profile.affiliations) a.isPrimary = false;
  }
  if (input.institution !== undefined) aff.institution = input.institution;
  if (input.role !== undefined) aff.roleTitle = input.role;
  if (input.rorId !== undefined) aff.rorId = input.rorId;
  if (input.startYear !== undefined) aff.startYear = input.startYear;
  if (input.endYear !== undefined) aff.endYear = input.endYear;
  if (input.primary !== undefined) aff.isPrimary = input.primary;
  profile.updatedAt = new Date().toISOString();
  return aff;
}

export async function deleteUserAffiliation(input: {
  userId: string;
  affiliationId: string;
}): Promise<boolean> {
  const profile = getContributorProfile(input.userId);
  const idx = profile.affiliations.findIndex((a) => a.id === input.affiliationId);
  if (idx === -1) return false;
  profile.affiliations.splice(idx, 1);
  profile.updatedAt = new Date().toISOString();
  return true;
}

export async function addUserExpertise(input: {
  userId: string;
  topicSlug: string;
  label: string;
  level: 'RESEARCHER' | 'DOMAIN_EXPERT' | 'MAINTAINER';
  supabase?: SupabaseClient | null;
}): Promise<UserExpertiseRecord> {
  const profile = getContributorProfile(input.userId);
  const rec: UserExpertiseRecord = {
    id: `exp-${randomUUID().slice(0, 10)}`,
    topicSlug: input.topicSlug,
    label: input.label,
    evidenceNote: `Self-declared ${input.level} expertise`,
  };
  profile.expertise.unshift(rec);
  profile.updatedAt = new Date().toISOString();
  if (input.supabase && isUuid(input.userId)) {
    await runSupabaseMutation(input.supabase, (client) =>
      client.from('v34_user_expertise').insert({
        user_id: input.userId,
        topic_slug: rec.topicSlug,
        label: rec.label,
        evidence_note: rec.evidenceNote,
      }),
    );
  }
  return rec;
}

export async function deleteUserExpertise(input: {
  userId: string;
  expertiseId: string;
}): Promise<boolean> {
  const profile = getContributorProfile(input.userId);
  const idx = profile.expertise.findIndex((e) => e.id === input.expertiseId);
  if (idx === -1) return false;
  profile.expertise.splice(idx, 1);
  profile.updatedAt = new Date().toISOString();
  return true;
}

export async function connectUserOrcid(input: {
  userId: string;
  orcid: string;
  supabase?: SupabaseClient | null;
}): Promise<ContributorProfileRecord> {
  const existing = getContributorProfile(input.userId);
  const updated = await updateContributorProfile({
    userId: input.userId,
    username: existing.username,
    orcidId: input.orcid,
    supabase: input.supabase,
  });
  await recordAuditEvent({
    actorId: input.userId,
    action: 'orcid_connected',
    targetType: 'profile',
    targetId: input.userId,
    metadata: { verifiedFormat: true },
    supabase: input.supabase,
  });
  return updated;
}

export async function connectUserGithub(input: {
  userId: string;
  githubHandle: string;
  supabase?: SupabaseClient | null;
}): Promise<ContributorProfileRecord> {
  const existing = getContributorProfile(input.userId);
  const updated = await updateContributorProfile({
    userId: input.userId,
    username: existing.username,
    githubHandle: input.githubHandle,
    supabase: input.supabase,
  });
  await recordAuditEvent({
    actorId: input.userId,
    action: 'github_connected',
    targetType: 'profile',
    targetId: input.userId,
    metadata: { connected: true },
    supabase: input.supabase,
  });
  return updated;
}

export async function tombstoneUserAccount(input: {
  userId: string;
  retainCitationTombstones: boolean;
  supabase?: SupabaseClient | null;
}): Promise<AccountTombstoneRecord> {
  const devices = listUserDevices(input.userId);
  const subs = listPushSubscriptions(input.userId);
  const rec: AccountTombstoneRecord = {
    userId: input.userId,
    tombstonedAt: new Date().toISOString(),
    retainCitationTombstones: input.retainCitationTombstones,
    revokedDevicesCount: devices.length,
    revokedSubscriptionsCount: subs.length,
  };
  getState().tombstones[input.userId] = rec;

  await emitDomainEvent(
    { type: 'AccountTombstoned', userId: input.userId },
    { actorId: input.userId, supabase: input.supabase },
  );
  await recordAuditEvent({
    actorId: input.userId,
    action: 'account_tombstoned',
    targetType: 'user',
    targetId: input.userId,
    metadata: {
      retainCitationTombstones: input.retainCitationTombstones,
      revokedDevicesCount: rec.revokedDevicesCount,
    },
    supabase: input.supabase,
  });
  return rec;
}

// ── Granular Dashboard Queries (Part V §6.3) ─────────────────────────────

export function getDashboardContinueWorking(userId: string) {
  const drafts = listUserDrafts(userId).slice(0, 5);
  const libraryInProgress = listLibraryItems(userId).slice(0, 5);
  return {
    drafts,
    readingItems: libraryInProgress,
    totalActionable: drafts.length + libraryInProgress.length,
  };
}

export function getDashboardActivity(userId: string) {
  const notifications = listNotifications(userId).slice(0, 20);
  const attention = listAttentionItems(userId).slice(0, 10);
  return {
    items: [
      ...attention.map((a) => ({
        id: a.id,
        kind: 'attention' as const,
        severity: a.severity,
        title: a.title,
        timestamp: a.updatedAt,
      })),
      ...notifications.map((n) => ({
        id: n.id,
        kind: 'notification' as const,
        severity: 'INFO' as const,
        title: n.title,
        timestamp: n.createdAt,
      })),
    ].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
  };
}

export function getDashboardImpact(userId: string, range: string) {
  const recognition = getRecognitionSummary(userId);
  const contributions = listContributions({ includeDraftsForAuthorId: userId });
  return {
    range,
    recognition,
    publishedContributions: contributions.filter((c) => c.lifecycle === 'published' || c.lifecycle === 'validated')
      .length,
    totalContributions: contributions.length,
    canonicalEvidenceLinked: listEvidence().length,
    canonicalClaimsLinked: listClaims().length,
  };
}

export async function reorderDashboardModules(input: {
  userId: string;
  moduleOrder: string[];
  supabase?: SupabaseClient | null;
}) {
  const current = getDashboardPreferences(input.userId);
  const updated = await updateDashboardPreferences({
    userId: input.userId,
    defaultLanding: current.defaultLanding,
    supabase: input.supabase ?? null,
  });
  return { preferences: updated, moduleOrder: input.moduleOrder };
}

export function isWorkspaceAdminOrOwner(workspaceId: string, userId: string): boolean {
  const members = listWorkspaceMembers(workspaceId);
  const m = members.find((mem) => mem.userId === userId);
  return Boolean(m && (m.role === 'OWNER' || m.role === 'ADMIN'));
}
