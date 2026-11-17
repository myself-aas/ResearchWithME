/**
 * ResearchWithME v3.4 §C.3 — Retryable Write Idempotency Guard.
 *
 * When a caller supplies an `Idempotency-Key` HTTP header on a retryable
 * mutation endpoint:
 *  - Identical retries (same scope + actor + request fingerprint) replay the
 *    exact stored status and JSON body with `X-Idempotency-Replayed: true`
 *    without duplicating database mutations.
 *  - Reusing an existing key with a different request payload fails closed
 *    with HTTP 409 (`IDEMPOTENCY_CONFLICT`).
 */
import crypto from 'node:crypto';
import { NextResponse } from 'next/server';

interface StoredIdempotentResponse {
  fingerprint: string;
  status: number;
  bodyText: string;
  contentType: string;
  createdAt: number;
}

const MAX_ENTRIES = 1_000;
const TTL_MS = 15 * 60 * 1_000; // 15 minutes

const store = new Map<string, StoredIdempotentResponse>();

export function resetIdempotencyStoreForTesting() {
  store.clear();
}

function pruneExpired(now: number) {
  for (const [k, v] of store.entries()) {
    if (now - v.createdAt > TTL_MS) {
      store.delete(k);
    }
  }
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (!oldest) break;
    store.delete(oldest);
  }
}

export function extractIdempotencyKey(request: Request): string | null {
  const raw = request.headers.get('idempotency-key')?.trim();
  if (!raw || raw.length > 128) return null;
  return raw;
}

export async function runWithIdempotency(
  request: Request,
  options: {
    scope: string;
    actorId: string;
    payloadHashInput: unknown;
  },
  execute: () => Promise<NextResponse>,
): Promise<NextResponse> {
  const key = extractIdempotencyKey(request);
  if (!key) {
    return execute();
  }

  const now = Date.now();
  pruneExpired(now);

  const compositeKey = `${options.scope}:${options.actorId}:${key}`;
  const fingerprint = crypto
    .createHash('sha256')
    .update(JSON.stringify(options.payloadHashInput ?? null))
    .digest('hex');

  const existing = store.get(compositeKey);
  if (existing && now - existing.createdAt <= TTL_MS) {
    if (existing.fingerprint !== fingerprint) {
      return NextResponse.json(
        {
          error:
            'Idempotency-Key was already used with a different request payload. Generate a fresh key for distinct writes.',
          code: 'IDEMPOTENCY_CONFLICT',
        },
        { status: 409 },
      );
    }
    return new NextResponse(existing.bodyText, {
      status: existing.status,
      headers: {
        'Content-Type': existing.contentType,
        'Idempotency-Key': key,
        'X-Idempotency-Replayed': 'true',
      },
    });
  }

  const response = await execute();
  // Only cache deterministic responses (2xx / 4xx, never transient 5xx)
  if (response.status < 500) {
    const cloned = response.clone();
    const bodyText = await cloned.text();
    const contentType = cloned.headers.get('content-type') || 'application/json';
    store.set(compositeKey, {
      fingerprint,
      status: response.status,
      bodyText,
      contentType,
      createdAt: now,
    });
    response.headers.set('Idempotency-Key', key);
  }
  return response;
}
