/**
 * ResearchWithME v3.4 — Durable Transactional Outbox Worker (Wave 18 P1).
 *
 * Processes `v34_outbox_events` via:
 *   1. Postgres `v34_claim_outbox_batch` (`FOR UPDATE SKIP LOCKED` leases),
 *   2. Idempotent consumer deduplication via `v34_outbox_consumer_receipts` (`v34_ack_outbox_event`),
 *   3. Exponential retry backoff + automatic `DEAD_LETTERED` transition (`v34_nack_outbox_event`),
 *   4. Cloudflare Queue batch consumption (`processOutboxQueueBatch`) AND
 *      Cron / HTTP drain (`drainOutboxBatch`),
 *   5. Live delivery fan-out (VAPID Web Push, Resend digests, Supabase Realtime)
 *      and OTel/Sentry trace correlation.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  publishRealtimePrivateEvent,
  sendWebPushNotification,
  type PushSubscriptionTarget,
} from './delivery';
import { enqueueAndRunJob } from './job-runner';
import {
  createRequestContext,
  logStructuredError,
  sanitizeTelemetryMetadata,
} from './observability';
import {
  listOutboxEvents,
  type BackgroundJobType,
  type DomainEvent,
  type OutboxEventRecord,
} from './outbox';
import { runSupabaseRpc } from './supabase-sync';
import { captureSentryException, exportOtlpSpan } from './telemetry-export';

export interface OutboxRow {
  id: string;
  actor_id: string | null;
  event_type: DomainEvent['type'];
  aggregate_id: string;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts?: number;
  status?: 'PENDING' | 'PROCESSING' | 'PUBLISHED' | 'DEAD_LETTERED';
  next_attempt_at?: string;
  last_error?: string | null;
  created_at: string;
}

export interface OutboxQueueEnvelope {
  id: string;
  eventType: DomainEvent['type'];
  aggregateId: string;
  actorId: string | null;
  payload: Record<string, unknown>;
  attempts: number;
}

export interface OutboxDrainSummary {
  consumer: string;
  claimed: number;
  published: number;
  deduplicated: number;
  retried: number;
  deadLettered: number;
  durationMs: number;
}

export type OutboxEventHandler = (
  event: OutboxQueueEnvelope,
  ctx: {
    consumer: string;
    supabase?: SupabaseClient | null;
  },
) => Promise<Record<string, unknown>>;

// In-memory idempotent consumer receipts & dead-letter tracking for local/test runs
const localReceipts = new Map<string, { processedAt: string; result: Record<string, unknown> }>();
const localDeadLetters = new Map<
  string,
  { event: OutboxQueueEnvelope; error: string; deadLetteredAt: string; attempts: number }
>();

export function resetOutboxWorkerForTesting(): void {
  localReceipts.clear();
  localDeadLetters.clear();
}

export function listLocalOutboxDeadLetters() {
  return [...localDeadLetters.values()];
}

function receiptKey(consumer: string, eventId: string): string {
  return `${consumer}::${eventId}`;
}

function eventToJobType(eventType: DomainEvent['type']): BackgroundJobType {
  switch (eventType) {
    case 'ContributionPublished':
      return 'contribution.publish';
    case 'SourceIntegrityChanged':
      return 'integrity.propagate';
    case 'ReviewRequested':
      return 'notification.dispatch';
    case 'DraftConflictDetected':
      return 'notification.dispatch';
    case 'EvidenceReused':
      return 'analytics.aggregate';
    case 'AiProvenanceDecided':
      return 'ai.validate';
    case 'ToolMetadataRefreshed':
      return 'source.refresh';
    case 'RenderJobRequested':
      return 'render.remotion';
    case 'AccountTombstoned':
      return 'retention.cleanup';
  }
}

async function fetchActivePushSubscriptions(
  supabase: SupabaseClient | null | undefined,
  userId: string | null,
): Promise<PushSubscriptionTarget[]> {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from('v34_push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth_secret, classification_safe_preview')
    .eq('user_id', userId)
    .is('revoked_at', null);

  if (error || !Array.isArray(data)) return [];
  return data.map((row) => ({
    id: String(row.id),
    userId: String(row.user_id),
    endpoint: String(row.endpoint),
    p256dh: String(row.p256dh),
    authSecret: String(row.auth_secret),
    classificationSafePreview: Boolean(row.classification_safe_preview ?? true),
  }));
}

/**
 * Default deterministic handler routing each outbox domain event to its
 * background job handler AND live delivery fan-out (Realtime + VAPID Push).
 */
export async function defaultOutboxEventHandler(
  event: OutboxQueueEnvelope,
  ctx: { consumer: string; supabase?: SupabaseClient | null },
): Promise<Record<string, unknown>> {
  const jobType =
    event.eventType === 'RenderJobRequested' && event.payload.engine === 'HYPERFRAMES'
      ? 'render.hyperframes'
      : eventToJobType(event.eventType);

  const { execution } = await enqueueAndRunJob({
    ownerId: event.actorId,
    jobType,
    payload: {
      ...event.payload,
      aggregateId: event.aggregateId,
      outboxEventId: event.id,
    },
  });

  if (execution.status === 'FAILED') {
    throw new Error(String(execution.summary.error ?? `Job ${jobType} failed`));
  }

  let realtimeBroadcast = false;
  let pushAttempted = 0;

  if (
    event.eventType === 'SourceIntegrityChanged' ||
    event.eventType === 'ReviewRequested' ||
    event.eventType === 'DraftConflictDetected'
  ) {
    const targetUserId =
      typeof event.payload.reviewerId === 'string'
        ? event.payload.reviewerId
        : typeof event.payload.userId === 'string'
          ? event.payload.userId
          : event.actorId;

    if (targetUserId) {
      const rt = await publishRealtimePrivateEvent({
        userId: targetUserId,
        event:
          event.eventType === 'SourceIntegrityChanged'
            ? 'integrity.alert'
            : 'notification.created',
        classification: event.eventType === 'SourceIntegrityChanged' ? 'PUBLIC' : 'WORKSPACE',
        objectType: event.eventType === 'SourceIntegrityChanged' ? 'source' : 'notification',
        objectId: event.aggregateId,
        publicTitle:
          event.eventType === 'SourceIntegrityChanged'
            ? `Source integrity status changed (${event.aggregateId})`
            : 'ResearchWithME workflow update',
      });
      realtimeBroadcast = rt.broadcast;

      const subs = await fetchActivePushSubscriptions(ctx.supabase, targetUserId);
      for (const sub of subs) {
        pushAttempted += 1;
        await sendWebPushNotification({
          subscription: sub,
          category:
            event.eventType === 'SourceIntegrityChanged' ? 'integrity_alert' : 'review_deadline',
          classification: event.eventType === 'SourceIntegrityChanged' ? 'PUBLIC' : 'WORKSPACE',
          publicTitle: `Source integrity alert (${event.aggregateId})`,
          actionHref: '/dashboard',
          dedupeKey: `${event.eventType}:${event.aggregateId}:${targetUserId}`,
          supabase: ctx.supabase,
        });
      }
    }
  }

  return sanitizeTelemetryMetadata({
    jobId: execution.jobId,
    jobType,
    realtimeBroadcast,
    pushAttempted,
  });
}

function toEnvelopeFromRecord(rec: OutboxEventRecord): OutboxQueueEnvelope {
  return {
    id: rec.id,
    eventType: rec.eventType,
    aggregateId: rec.aggregateId,
    actorId: rec.actorId,
    payload: rec.payload,
    attempts: rec.attempts,
  };
}

function toEnvelopeFromRow(row: OutboxRow): OutboxQueueEnvelope {
  return {
    id: row.id,
    eventType: row.event_type,
    aggregateId: row.aggregate_id,
    actorId: row.actor_id,
    payload: row.payload ?? {},
    attempts: row.attempts ?? 1,
  };
}

/**
 * Processes an explicit batch of outbox envelopes (called directly by
 * Cloudflare Queue consumers in `workers/outbox/src/index.ts` or tests).
 * Guarantees idempotent consumer receipt tracking and DLQ routing.
 */
export async function processOutboxQueueBatch(
  envelopes: readonly OutboxQueueEnvelope[],
  opts: {
    consumer?: string;
    maxAttempts?: number;
    backoffSeconds?: number;
    supabase?: SupabaseClient | null;
    handler?: OutboxEventHandler;
    requestId?: string;
    traceId?: string;
  } = {},
): Promise<OutboxDrainSummary> {
  const startedAt = Date.now();
  const consumer = opts.consumer ?? 'rwm-outbox-worker';
  const maxAttempts = opts.maxAttempts ?? 5;
  const backoffSeconds = opts.backoffSeconds ?? 30;
  const handler = opts.handler ?? defaultOutboxEventHandler;

  let published = 0;
  let deduplicated = 0;
  let retried = 0;
  let deadLettered = 0;

  for (const envelope of envelopes) {
    const rKey = receiptKey(consumer, envelope.id);
    if (localReceipts.has(rKey)) {
      deduplicated += 1;
      continue;
    }

    const spanStart = Date.now();
    const reqCtx = createRequestContext(
      {
        headers: {
          get: (k) =>
            k === 'x-request-id'
              ? (opts.requestId ?? null)
              : k === 'x-trace-id'
                ? (opts.traceId ?? null)
                : null,
        },
      },
      { route: `outbox:${envelope.eventType}`, userId: envelope.actorId },
    );

    try {
      const result = await handler(envelope, { consumer, supabase: opts.supabase });

      if (opts.supabase) {
        const newlyInserted = await runSupabaseRpc<boolean>(
          opts.supabase,
          'v34_ack_outbox_event',
          {
            p_event_id: envelope.id,
            p_consumer: consumer,
            p_result: result,
          },
          { failClosed: true },
        );
        if (newlyInserted === false) {
          deduplicated += 1;
          localReceipts.set(rKey, { processedAt: new Date().toISOString(), result });
          continue;
        }
      }

      localReceipts.set(rKey, { processedAt: new Date().toISOString(), result });
      published += 1;

      await exportOtlpSpan({
        name: `outbox.process.${envelope.eventType}`,
        ctx: reqCtx,
        startTimeMs: spanStart,
        endTimeMs: Date.now(),
        status: 'OK',
        attributes: { consumer, eventId: envelope.id, aggregateId: envelope.aggregateId },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Outbox handler error';
      logStructuredError('outbox.event.failed', reqCtx, err, {
        consumer,
        eventId: envelope.id,
        eventType: envelope.eventType,
        attempts: envelope.attempts,
      });
      await captureSentryException('outbox.event.failed', reqCtx, err, {
        extra: { consumer, eventId: envelope.id, eventType: envelope.eventType },
      });

      let transition: 'PENDING' | 'DEAD_LETTERED' =
        envelope.attempts >= maxAttempts ? 'DEAD_LETTERED' : 'PENDING';

      if (opts.supabase) {
        const rpcStatus = await runSupabaseRpc<string>(
          opts.supabase,
          'v34_nack_outbox_event',
          {
            p_event_id: envelope.id,
            p_error: message,
            p_backoff_seconds: backoffSeconds,
          },
          { failClosed: true },
        );
        if (rpcStatus === 'DEAD_LETTERED') {
          transition = 'DEAD_LETTERED';
        }
      }

      if (transition === 'DEAD_LETTERED') {
        deadLettered += 1;
        localDeadLetters.set(envelope.id, {
          event: envelope,
          error: message,
          deadLetteredAt: new Date().toISOString(),
          attempts: envelope.attempts,
        });
      } else {
        retried += 1;
      }
    }
  }

  return {
    consumer,
    claimed: envelopes.length,
    published,
    deduplicated,
    retried,
    deadLettered,
    durationMs: Date.now() - startedAt,
  };
}

/**
 * Claims and drains a batch of due `v34_outbox_events` from Postgres
 * (via `v34_claim_outbox_batch` using `FOR UPDATE SKIP LOCKED`) or from the
 * in-memory outbox buffer in local/test runs.
 */
export async function drainOutboxBatch(
  opts: {
    consumer?: string;
    limit?: number;
    leaseSeconds?: number;
    maxAttempts?: number;
    backoffSeconds?: number;
    supabase?: SupabaseClient | null;
    handler?: OutboxEventHandler;
    requestId?: string;
    traceId?: string;
  } = {},
): Promise<OutboxDrainSummary> {
  const consumer = opts.consumer ?? 'rwm-cron-outbox-drain';
  const limit = Math.max(1, Math.min(opts.limit ?? 25, 100));

  let batch: OutboxQueueEnvelope[] = [];

  if (opts.supabase) {
    const claimedRows = await runSupabaseRpc<OutboxRow[]>(
      opts.supabase,
      'v34_claim_outbox_batch',
      {
        p_consumer: consumer,
        p_limit: limit,
        p_lease_seconds: opts.leaseSeconds ?? 60,
      },
      { failClosed: true },
    );
    batch = Array.isArray(claimedRows) ? claimedRows.map(toEnvelopeFromRow) : [];
  } else {
    const pending = listOutboxEvents()
      .filter((e) => !e.publishedAt && !localDeadLetters.has(e.id))
      .slice(0, limit);
    for (const rec of pending) {
      rec.attempts += 1;
    }
    batch = pending.map(toEnvelopeFromRecord);
  }

  const summary = await processOutboxQueueBatch(batch, {
    ...opts,
    consumer,
  });

  // Mark published records in local in-memory buffer when running without Supabase
  if (!opts.supabase) {
    const now = new Date().toISOString();
    for (const rec of listOutboxEvents()) {
      if (localReceipts.has(receiptKey(consumer, rec.id)) && !rec.publishedAt) {
        rec.publishedAt = now;
      }
    }
  }

  return summary;
}
