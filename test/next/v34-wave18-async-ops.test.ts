import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getContributions } from '@/app/api/contributions/route';
import { GET as getOutboxDrain, POST as postOutboxDrain } from '@/app/api/cron/outbox-drain/route';
import { GET as getFeed } from '@/app/api/feed/route';
import { GET as getSources } from '@/app/api/sources/route';
import {
  publishRealtimePrivateEvent,
  sendNotificationDigestEmail,
  sendWebPushNotification,
  signVapidJwt,
} from '@/lib/v34/delivery';
import { createScholarlyExport, resetExportsStoreForTesting } from '@/lib/v34/exports';
import { createRequestContext } from '@/lib/v34/observability';
import { emitDomainEvent, resetOutboxForTesting } from '@/lib/v34/outbox';
import {
  drainOutboxBatch,
  listLocalOutboxDeadLetters,
  processOutboxQueueBatch,
  resetOutboxWorkerForTesting,
} from '@/lib/v34/outbox-worker';
import {
  decodeCursor,
  encodeCursor,
  paginateArrayWithCursor,
  parsePaginationParams,
} from '@/lib/v34/pagination';
import { createR2PresignedGetUrl, storeArtifactInR2 } from '@/lib/v34/r2-storage';
import { resetV34StoreForTesting } from '@/lib/v34/store';
import {
  buildOtlpSpanPayload,
  buildSentryEnvelope,
  captureSentryException,
  exportOtlpSpan,
  parseSentryDsn,
} from '@/lib/v34/telemetry-export';
import { createRenderJob, resetWave8StoreForTesting } from '@/lib/v34/wave8-store';

describe('Wave 18 (P1) — Async Platform, Live Delivery, R2 Storage & Operational Readiness', () => {
  beforeEach(() => {
    resetV34StoreForTesting();
    resetOutboxForTesting();
    resetOutboxWorkerForTesting();
    resetExportsStoreForTesting();
    resetWave8StoreForTesting();
  });

  it('1. Durable outbox worker enforces idempotent consumer receipts, retry backoff, and dead-letter transitions', async () => {
    await emitDomainEvent(
      { type: 'ContributionPublished', contributionId: 'contrib-rl-cold-start', actorId: 'u-1' },
      { actorId: 'u-1' },
    );

    const first = await drainOutboxBatch({ consumer: 'test-consumer', limit: 10 });
    expect(first.claimed).toBe(1);
    expect(first.published).toBe(1);
    expect(first.deadLettered).toBe(0);

    // Replaying the exact same envelope for the same consumer is strictly deduplicated
    const replay = await processOutboxQueueBatch(
      [
        {
          id: 'evt-idempotent-1',
          eventType: 'ContributionPublished',
          aggregateId: 'contrib-rl-cold-start',
          actorId: 'u-1',
          payload: { contributionId: 'contrib-rl-cold-start' },
          attempts: 1,
        },
        {
          id: 'evt-idempotent-1',
          eventType: 'ContributionPublished',
          aggregateId: 'contrib-rl-cold-start',
          actorId: 'u-1',
          payload: { contributionId: 'contrib-rl-cold-start' },
          attempts: 2,
        },
      ],
      { consumer: 'test-consumer-replay' },
    );
    expect(replay.published).toBe(1);
    expect(replay.deduplicated).toBe(1);

    // Failing at maxAttempts transitions to dead-letter tracking
    const failed = await processOutboxQueueBatch(
      [
        {
          id: 'evt-dlq-1',
          eventType: 'SourceIntegrityChanged',
          aggregateId: 'src-arxiv-2501-12948',
          actorId: 'u-1',
          payload: { sourceId: 'src-arxiv-2501-12948' },
          attempts: 5,
        },
      ],
      {
        consumer: 'test-dlq',
        maxAttempts: 5,
        handler: async () => {
          throw new Error('simulated permanent failure');
        },
      },
    );
    expect(failed.deadLettered).toBe(1);
    expect(listLocalOutboxDeadLetters().some((d) => d.event.id === 'evt-dlq-1')).toBe(true);
  });

  it('2. /api/cron/outbox-drain enforces CRON_SECRET auth and drains pending outbox events', async () => {
    const prevSecret = process.env.CRON_SECRET;
    process.env.CRON_SECRET = 'wave18-test-secret';
    try {
      const unauth = await getOutboxDrain(
        new NextRequest('http://localhost/api/cron/outbox-drain'),
      );
      expect(unauth.status).toBe(401);

      await emitDomainEvent(
        { type: 'ToolMetadataRefreshed', toolId: 'tool-vllm', actorId: 'u-1' },
        { actorId: 'u-1' },
      );

      const okRes = await postOutboxDrain(
        new NextRequest('http://localhost/api/cron/outbox-drain?limit=10&consumer=ci-test', {
          method: 'POST',
          headers: { Authorization: 'Bearer wave18-test-secret' },
        }),
      );
      expect(okRes.status).toBe(200);
      expect(okRes.headers.get('X-Request-Id')).toBeTruthy();
      expect(okRes.headers.get('X-Trace-Id')).toBeTruthy();
      const body = (await okRes.json()) as { ok: boolean; claimed: number; published: number };
      expect(body.ok).toBe(true);
      expect(body.claimed).toBe(1);
      expect(body.published).toBe(1);
    } finally {
      if (prevSecret === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = prevSecret;
    }
  });

  it('3. Canonical keyset cursor pagination works across pages and primary list endpoints', async () => {
    const token = encodeCursor({ sortAt: '2026-11-16T00:00:00.000Z', id: 'item-42' });
    expect(decodeCursor(token)).toEqual({ sortAt: '2026-11-16T00:00:00.000Z', id: 'item-42' });
    expect(decodeCursor('not-valid-cursor!')).toBeNull();

    const rows = [
      { id: 'c', createdAt: '2026-11-16T03:00:00Z' },
      { id: 'b', createdAt: '2026-11-16T02:00:00Z' },
      { id: 'a', createdAt: '2026-11-16T01:00:00Z' },
    ];
    const p1 = paginateArrayWithCursor(
      rows,
      parsePaginationParams('http://localhost/api/items?limit=2'),
      { getSortAt: (r) => r.createdAt, getId: (r) => r.id },
    );
    expect(p1.items.map((r) => r.id)).toEqual(['c', 'b']);
    expect(p1.hasMore).toBe(true);
    expect(p1.nextCursor).toBeTruthy();
    expect(p1.total).toBe(3);

    const p2 = paginateArrayWithCursor(
      rows,
      parsePaginationParams(`http://localhost/api/items?limit=2&cursor=${encodeURIComponent(p1.nextCursor!)}`),
      { getSortAt: (r) => r.createdAt, getId: (r) => r.id },
    );
    expect(p2.items.map((r) => r.id)).toEqual(['a']);
    expect(p2.hasMore).toBe(false);
    expect(p2.nextCursor).toBeNull();

    // Verify canonical fields on live route handlers
    const contribRes = await getContributions(new Request('http://localhost/api/contributions?limit=1'));
    expect(contribRes.status).toBe(200);
    const contribJson = (await contribRes.json()) as {
      contributions: unknown[];
      limit: number;
      hasMore: boolean;
      nextCursor: string | null;
      total: number;
    };
    expect(contribJson.limit).toBe(1);
    expect(contribJson.contributions.length).toBeLessThanOrEqual(1);
    expect(typeof contribJson.total).toBe('number');

    const srcRes = await getSources(new Request('http://localhost/api/sources?limit=1'));
    expect(srcRes.status).toBe(200);
    const srcJson = (await srcRes.json()) as { limit: number; total: number };
    expect(srcJson.limit).toBe(1);

    const feedRes = await getFeed(new Request('http://localhost/api/feed?limit=2'));
    expect(feedRes.status).toBe(200);
    const feedJson = (await feedRes.json()) as { limit: number; hasMore: boolean; total: number };
    expect(feedJson.limit).toBe(2);
  });

  it('4. VAPID ES256 JWT signing, classification-safe Web Push, Resend digest & Realtime fan-out', async () => {
    // Generate ephemeral P-256 ECDSA key pair matching RFC 8292 VAPID
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const pubJwk = publicKey.export({ format: 'jwk' }) as { x: string; y: string };
    const privPem = privateKey.export({ format: 'pem', type: 'pkcs8' }) as string;
    const uncompressedPub = Buffer.concat([
      Buffer.from([0x04]),
      Buffer.from(pubJwk.x, 'base64url'),
      Buffer.from(pubJwk.y, 'base64url'),
    ]).toString('base64url');

    const jwt = signVapidJwt('https://fcm.googleapis.com', {
      publicKey: uncompressedPub,
      privateKeyPemOrJwk: privPem,
      subject: 'mailto:notifications@researchwith.me',
    });
    expect(jwt.split('.')).toHaveLength(3);

    // Push delivery masks CONFIDENTIAL title and handles 410 Gone revocation
    const pushRes = await sendWebPushNotification({
      subscription: {
        id: 'sub-1',
        userId: 'u-1',
        endpoint: 'https://fcm.googleapis.com/fcm/send/demo-token',
        p256dh: 'demo-p256dh',
        authSecret: 'demo-auth',
        classificationSafePreview: true,
      },
      category: 'integrity_alert',
      classification: 'CONFIDENTIAL',
      publicTitle: 'TOP SECRET UNPUBLISHED MOLECULE X-99',
      actionHref: '/dashboard',
      dedupeKey: 'integrity:evt-1:u-1',
      env: {
        VAPID_PUBLIC_KEY: uncompressedPub,
        VAPID_PRIVATE_KEY: privPem,
        VAPID_SUBJECT: 'mailto:notifications@researchwith.me',
      },
      fetchImpl: (async () => new Response(null, { status: 410 })) as unknown as typeof fetch,
    });
    expect(pushRes.revoked).toBe(true);
    expect(pushRes.previewText).not.toContain('TOP SECRET');

    // Resend digest masks non-public titles and uses verified sending domain
    let sentPayload: Record<string, unknown> | null = null;
    const digestRes = await sendNotificationDigestEmail({
      userId: 'u-1',
      recipientEmail: 'researcher@example.edu',
      digestDate: '2026-11-17',
      items: [
        {
          id: 'n-1',
          category: 'integrity_alert',
          classification: 'RESTRICTED',
          publicTitle: 'CONFIDENTIAL LAB RESULT 42',
          actionHref: '/dashboard',
          createdAt: '2026-11-17T10:00:00Z',
        },
      ],
      resendClient: {
        emails: {
          send: (async (payload: Record<string, unknown>) => {
            sentPayload = payload;
            return { data: { id: 're_digest_123' }, error: null };
          }) as never,
        },
      } as never,
    });
    expect(digestRes.ok).toBe(true);
    expect(digestRes.id).toBe('re_digest_123');
    expect(String(sentPayload?.['from'] ?? '')).toContain('@researchwith.me');
    expect(String(sentPayload?.['html'] ?? '')).not.toContain('CONFIDENTIAL LAB RESULT 42');

    // Supabase Realtime REST broadcast uses classification-safe payload
    let broadcastBody = '';
    const rtRes = await publishRealtimePrivateEvent({
      userId: 'u-1',
      event: 'attention.updated',
      classification: 'CONFIDENTIAL',
      objectType: 'attention',
      objectId: 'att-1',
      publicTitle: 'PRIVATE EMBARGOED DRAFT',
      env: {
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'svc-test-key',
      },
      fetchImpl: (async (_url: string | URL | Request, init?: RequestInit) => {
        broadcastBody = String(init?.body ?? '');
        return new Response('{}', { status: 202 });
      }) as unknown as typeof fetch,
    });
    expect(rtRes.broadcast).toBe(true);
    expect(rtRes.topic).toBe('private-user:u-1');
    expect(broadcastBody).not.toContain('PRIVATE EMBARGOED DRAFT');
  });

  it('5. Cloudflare R2 SigV4 presigned URLs and R2-backed export/render storage work cleanly', async () => {
    const r2Env = {
      R2_ACCOUNT_ID: '74d241df16b8aaa80914e3dbb6e16758',
      R2_BUCKET: 'rwm-artifacts',
      R2_ACCESS_KEY_ID: 'R2TESTACCESSKEY',
      R2_SECRET_ACCESS_KEY: 'R2TESTSECRETKEY',
    };
    const signed = createR2PresignedGetUrl(
      {
        accountId: r2Env.R2_ACCOUNT_ID,
        bucket: r2Env.R2_BUCKET,
        accessKeyId: r2Env.R2_ACCESS_KEY_ID,
        secretAccessKey: r2Env.R2_SECRET_ACCESS_KEY,
        endpoint: `https://${r2Env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      },
      'exports/u-1/exp-1/paper.bib',
      { expiresInSeconds: 600 },
    );
    expect(signed.url).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
    expect(signed.url).toContain('X-Amz-Signature=');
    expect(signed.url).toContain('/rwm-artifacts/exports/u-1/exp-1/paper.bib');

    let putMethod = '';
    const stored = await storeArtifactInR2({
      key: 'exports/u-1/exp-1/paper.bib',
      body: '@misc{test, title={Test}}',
      contentType: 'application/x-bibtex',
      filename: 'paper.bib',
      env: r2Env,
      fetchImpl: (async (_url: string | URL | Request, init?: RequestInit) => {
        putMethod = String(init?.method ?? '');
        return new Response(null, { status: 200 });
      }) as unknown as typeof fetch,
    });
    expect(putMethod).toBe('PUT');
    expect(stored.provider).toBe('r2');
    expect(stored.checksumSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.signedUrl).toContain('X-Amz-Signature=');

    // Inline graceful degradation for exports and renders when R2 credentials are unset
    const exp = await createScholarlyExport({
      userId: 'local-contributor',
      targetType: 'contribution',
      targetId: 'contrib-rl-cold-start',
      format: 'bibtex',
    });
    expect(exp.ok).toBe(true);
    if (exp.ok) {
      expect(exp.exportRecord.storageProvider).toBe('inline');
      expect(exp.exportRecord.checksumSha256).toMatch(/^[0-9a-f]{64}$/);
    }

    const rnd = await createRenderJob({
      ownerId: 'local-contributor',
      engine: 'REMOTION',
      compositionId: 'EvidenceExplainer',
      durationSeconds: 30,
      humanApproved: true,
      payload: { sourceId: 'src-arxiv-2501-12948' },
    });
    expect(rnd.storageProvider).toBe('inline');
    expect(rnd.inputChecksumSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('6. OTel OTLP trace export and Sentry envelope capture strictly redact sensitive research prose', async () => {
    const ctx = createRequestContext(
      new Request('http://localhost/api/drafts/d1/autosave', {
        headers: { 'x-request-id': 'req_wave18_1', 'x-trace-id': 'tr_0123456789abcdef' },
      }),
      { route: '/api/drafts/[id]/autosave', userId: 'u-1' },
    );

    const otlp = buildOtlpSpanPayload({
      name: 'draft.autosave',
      ctx,
      startTimeMs: Date.now() - 25,
      attributes: {
        body: 'PRIVATE UNPUBLISHED MANUSCRIPT',
        reviewerId: 'rev-secret-99',
        version: 4,
      },
    });
    const otlpJson = JSON.stringify(otlp);
    expect(otlpJson).not.toContain('PRIVATE UNPUBLISHED MANUSCRIPT');
    expect(otlpJson).not.toContain('rev-secret-99');
    expect(otlpJson).toContain('req_wave18_1');

    const otlpSend = await exportOtlpSpan(
      { name: 'draft.autosave', ctx, startTimeMs: Date.now() - 10 },
      {
        env: { OTEL_EXPORTER_OTLP_ENDPOINT: 'https://otlp.example.invalid' },
        fetchImpl: (async () => new Response('{}', { status: 200 })) as unknown as typeof fetch,
      },
    );
    expect(otlpSend.exported).toBe(true);

    const parsedDsn = parseSentryDsn('https://abc123key@o999.ingest.sentry.io/4242');
    expect(parsedDsn?.envelopeUrl).toBe('https://o999.ingest.sentry.io/api/4242/envelope/');

    const envBuilt = buildSentryEnvelope(
      parsedDsn!,
      'autosave.failed',
      ctx,
      new Error('DB write error'),
      { quote: 'CONFIDENTIAL QUOTE', secret: 'sk-123' },
    );
    expect(envBuilt.envelope).not.toContain('CONFIDENTIAL QUOTE');
    expect(envBuilt.envelope).not.toContain('sk-123');
    expect(envBuilt.envelope).toContain('req_wave18_1');

    const sentryRes = await captureSentryException('autosave.failed', ctx, new Error('boom'), {
      env: { SENTRY_DSN: 'https://abc123key@o999.ingest.sentry.io/4242' },
      fetchImpl: (async () => new Response('{}', { status: 200 })) as unknown as typeof fetch,
    });
    expect(sentryRes.captured).toBe(true);
  });

  it('7. Service Worker Background Sync, ADR-033, and 90/90 SQL table wiring invariants hold', () => {
    const root = process.cwd();
    const sw = fs.readFileSync(path.join(root, 'public/sw.js'), 'utf8');
    expect(sw).toContain("self.addEventListener('sync'");
    expect(sw).toContain('rwm-editor-autosave-sync');
    expect(sw).toContain("self.addEventListener('push'");

    const adr = fs.readFileSync(
      path.join(root, 'docs/adr/ADR-033-supabase-sql-over-prisma.md'),
      'utf8',
    );
    expect(adr).toContain('ADR-033');
    expect(adr).toContain('Prisma');
    expect(adr).toContain('Row-Level Security');

    // Verify 100% of v34_* SQL tables across all 12 migrations are wired in lib/v34
    const migDir = path.join(root, 'supabase/migrations');
    const sqlAll = fs
      .readdirSync(migDir)
      .filter((f) => f.endsWith('.sql'))
      .map((f) => fs.readFileSync(path.join(migDir, f), 'utf8'))
      .join('\n');
    const tables = [
      ...new Set(
        [...sqlAll.matchAll(/create table if not exists\s+(?:public\.)?(v34_[a-z0-9_]+)/gi)].map(
          (m) => m[1],
        ),
      ),
    ];
    const libDir = path.join(root, 'lib/v34');
    const libAll = fs
      .readdirSync(libDir)
      .filter((f) => f.endsWith('.ts'))
      .map((f) => fs.readFileSync(path.join(libDir, f), 'utf8'))
      .join('\n');
    const unused = tables.filter((t) => !libAll.includes(t));
    expect(tables.length).toBeGreaterThanOrEqual(90);
    expect(unused).toEqual([]);
  });
});
