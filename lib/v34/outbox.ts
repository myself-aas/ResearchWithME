import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isUuid, runSupabaseMutation } from './supabase-sync';
import { sanitizeTelemetryMetadata } from './observability';

/**
 * Part V §8.2 & §9 — Transactional Outbox, Domain Events, Background Jobs, and Audit Log.
 */
export type DomainEvent =
  | { type: 'ContributionPublished'; contributionId: string; actorId: string }
  | { type: 'SourceIntegrityChanged'; sourceId: string; eventId: string }
  | { type: 'ReviewRequested'; reviewId: string; reviewerId: string }
  | { type: 'DraftConflictDetected'; draftId: string; userId: string }
  | { type: 'EvidenceReused'; evidenceId: string; contributionId: string }
  | { type: 'AiProvenanceDecided'; provenanceId: string; decision: 'APPROVED' | 'REJECTED'; actorId: string }
  | { type: 'ToolMetadataRefreshed'; toolId: string; actorId: string }
  | { type: 'RenderJobRequested'; renderId: string; engine: 'REMOTION' | 'HYPERFRAMES'; actorId: string }
  | { type: 'AccountTombstoned'; userId: string };

export type BackgroundJobType =
  | 'source.resolve'
  | 'source.refresh'
  | 'source.integrity.ingest'
  | 'integrity.propagate'
  | 'search.index'
  | 'notification.dispatch'
  | 'notification.digest'
  | 'contribution.publish'
  | 'citation.validate'
  | 'ai.validate'
  | 'export.generate'
  | 'render.remotion'
  | 'render.hyperframes'
  | 'analytics.aggregate'
  | 'retention.cleanup';

export interface OutboxEventRecord {
  id: string;
  actorId: string | null;
  eventType: DomainEvent['type'];
  aggregateId: string;
  payload: Record<string, unknown>;
  attempts: number;
  publishedAt: string | null;
  createdAt: string;
}

export interface AuditEventRecord {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  workspaceId: string | null;
  requestId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface BackgroundJobRecord {
  id: string;
  ownerId: string | null;
  jobType: BackgroundJobType;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  attempts: number;
  runAfter: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface OutboxState {
  outbox: OutboxEventRecord[];
  audit: AuditEventRecord[];
  jobs: BackgroundJobRecord[];
}

const g = globalThis as unknown as { __v34OutboxState?: OutboxState };

function getOutboxState(): OutboxState {
  if (!g.__v34OutboxState) {
    g.__v34OutboxState = { outbox: [], audit: [], jobs: [] };
  }
  return g.__v34OutboxState;
}

export function resetOutboxForTesting(): void {
  g.__v34OutboxState = { outbox: [], audit: [], jobs: [] };
}

export async function emitDomainEvent(
  event: DomainEvent,
  opts: { actorId?: string | null; supabase?: SupabaseClient | null } = {},
): Promise<OutboxEventRecord> {
  const aggregateId =
    'contributionId' in event
      ? event.contributionId
      : 'sourceId' in event
        ? event.sourceId
        : 'reviewId' in event
          ? event.reviewId
          : 'draftId' in event
            ? event.draftId
            : 'provenanceId' in event
              ? event.provenanceId
              : 'toolId' in event
                ? event.toolId
                : 'renderId' in event
                  ? event.renderId
                  : event.userId;

  const rec: OutboxEventRecord = {
    id: `outbox_${randomUUID().slice(0, 12)}`,
    actorId: opts.actorId ?? null,
    eventType: event.type,
    aggregateId,
    payload: sanitizeTelemetryMetadata(event as unknown as Record<string, unknown>),
    attempts: 0,
    publishedAt: null,
    createdAt: new Date().toISOString(),
  };
  getOutboxState().outbox.unshift(rec);

  if (opts.supabase) {
    await runSupabaseMutation(opts.supabase, (client) =>
      client.from('v34_outbox_events').insert({
        actor_id: isUuid(opts.actorId) ? opts.actorId : null,
        event_type: rec.eventType,
        aggregate_id: rec.aggregateId,
        payload: rec.payload,
      }),
    );
  }

  return rec;
}

export async function recordAuditEvent(input: {
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  workspaceId?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
  supabase?: SupabaseClient | null;
}): Promise<AuditEventRecord> {
  const rec: AuditEventRecord = {
    id: `audit_${randomUUID().slice(0, 12)}`,
    actorId: input.actorId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    workspaceId: input.workspaceId ?? null,
    requestId: input.requestId ?? null,
    metadata: sanitizeTelemetryMetadata(input.metadata ?? {}),
    createdAt: new Date().toISOString(),
  };
  getOutboxState().audit.unshift(rec);

  if (input.supabase) {
    await runSupabaseMutation(input.supabase, (client) =>
      client.from('v34_audit_events').insert({
        actor_id: isUuid(rec.actorId) ? rec.actorId : null,
        action: rec.action,
        target_type: rec.targetType,
        target_id: rec.targetId,
        workspace_id: rec.workspaceId,
        request_id: rec.requestId,
        metadata: rec.metadata,
      }),
    );
  }

  return rec;
}

export async function enqueueBackgroundJob(input: {
  ownerId: string | null;
  jobType: BackgroundJobType;
  payload: Record<string, unknown>;
  supabase?: SupabaseClient | null;
}): Promise<BackgroundJobRecord> {
  const now = new Date().toISOString();
  const rec: BackgroundJobRecord = {
    id: `job_${randomUUID().slice(0, 12)}`,
    ownerId: input.ownerId,
    jobType: input.jobType,
    status: 'QUEUED',
    payload: sanitizeTelemetryMetadata(input.payload),
    result: null,
    error: null,
    attempts: 0,
    runAfter: now,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  getOutboxState().jobs.unshift(rec);

  if (input.supabase) {
    await runSupabaseMutation(input.supabase, (client) =>
      client.from('v34_background_jobs').insert({
        owner_id: isUuid(rec.ownerId) ? rec.ownerId : null,
        job_type: rec.jobType,
        status: rec.status,
        payload: rec.payload,
      }),
    );
  }

  return rec;
}

export function listOutboxEvents(): OutboxEventRecord[] {
  return [...getOutboxState().outbox];
}

export function listAuditEvents(actorId?: string): AuditEventRecord[] {
  const all = getOutboxState().audit;
  return actorId ? all.filter((a) => a.actorId === actorId) : [...all];
}

export function listBackgroundJobs(ownerId?: string): BackgroundJobRecord[] {
  const all = getOutboxState().jobs;
  return ownerId ? all.filter((j) => j.ownerId === ownerId) : [...all];
}
