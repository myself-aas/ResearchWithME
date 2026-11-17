/**
 * ResearchWithME v3.4 — Cloudflare Queues + Cron Outbox Worker (Wave 18 P1).
 *
 * 1. `scheduled`: Fires every 2 minutes via Cloudflare Cron Triggers to drain
 *    due rows from `v34_outbox_events` (`POST /api/cron/outbox-drain`) with
 *    bearer `CRON_SECRET` authentication and W3C trace headers.
 * 2. `queue`: Consumes pushed outbox envelopes from `researchwithme-outbox`
 *    with exponential retry backoff and automatic dead-letter routing into
 *    `researchwithme-outbox-dlq` after 5 failed attempts.
 */

export interface OutboxMessageBody {
  id: string;
  eventType: string;
  aggregateId: string;
  actorId: string | null;
}

export interface QueueMessage<T = unknown> {
  readonly id: string;
  readonly body: T;
  readonly attempts: number;
  ack(): void;
  retry(options?: { delaySeconds?: number }): void;
}

export interface MessageBatch<T = unknown> {
  readonly queue: string;
  readonly messages: readonly QueueMessage<T>[];
}

export interface OutboxWorkerEnv {
  SITE_ORIGIN: string;
  OUTBOX_CONSUMER_NAME: string;
  OUTBOX_BATCH_LIMIT: string;
  CRON_SECRET: string;
}

function buildDrainUrl(env: OutboxWorkerEnv): string {
  const origin = (env.SITE_ORIGIN || 'https://researchwith.me').replace(/\/$/, '');
  const limit = encodeURIComponent(env.OUTBOX_BATCH_LIMIT || '25');
  const consumer = encodeURIComponent(env.OUTBOX_CONSUMER_NAME || 'cf-outbox-worker');
  return `${origin}/api/cron/outbox-drain?limit=${limit}&consumer=${consumer}`;
}

async function invokeDrainEndpoint(env: OutboxWorkerEnv, traceId: string): Promise<Response> {
  return fetch(buildDrainUrl(env), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.CRON_SECRET}`,
      'X-Request-Id': `cfw_${crypto.randomUUID()}`,
      'X-Trace-Id': traceId,
      'Content-Type': 'application/json',
    },
  });
}

const outboxWorker = {
  async scheduled(
    _controller: { scheduledTime: number; cron: string },
    env: OutboxWorkerEnv,
  ): Promise<void> {
    if (!env.CRON_SECRET) {
      throw new Error('CRON_SECRET is not configured on researchwithme-outbox worker.');
    }
    const traceId = `tr_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const res = await invokeDrainEndpoint(env, traceId);
    if (!res.ok) {
      throw new Error(`Outbox cron drain failed with HTTP ${res.status}`);
    }
  },

  async queue(batch: MessageBatch<OutboxMessageBody>, env: OutboxWorkerEnv): Promise<void> {
    if (!env.CRON_SECRET) {
      for (const msg of batch.messages) {
        msg.retry({ delaySeconds: 60 });
      }
      return;
    }

    const traceId = `tr_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const res = await invokeDrainEndpoint(env, traceId);

    for (const msg of batch.messages) {
      if (res.ok) {
        msg.ack();
      } else {
        const delaySeconds = Math.min(3600, 15 * Math.pow(2, Math.max(0, msg.attempts - 1)));
        msg.retry({ delaySeconds });
      }
    }
  },
};

export default outboxWorker;
