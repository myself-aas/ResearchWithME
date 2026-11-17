/**
 * ResearchWithME v3.4 §C.3 — Durable Retryable Write Idempotency Guard.
 *
 * Wave 17 P0 Upgrade:
 *  - Backed durably by PostgreSQL `v34_idempotency_keys` via SECURITY INVOKER
 *    RPCs (`v34_idempotency_lookup`, `v34_idempotency_store`) whenever an
 *    authenticated Supabase client is available (and fails closed in strict
 *    persistence mode if durable idempotency storage fails).
 *  - Identical retries (same scope + actor + request fingerprint) replay the
 *    exact stored status and body with `X-Idempotency-Replayed: true`.
 *  - Reusing an existing key with a different payload fails closed with
 *    HTTP 409 (`IDEMPOTENCY_CONFLICT`).
 */
import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import {
  getOptionalAuthSupabase,
  isStrictPersistenceMode,
  isUuid,
  runSupabaseRpc,
  SupabasePersistenceError,
} from './supabase-sync';

interface StoredIdempotentResponse {
  fingerprint: string;
  status: number;
  bodyText: string;
  contentType: string;
  createdAt: number;
}

interface RemoteIdempotencyRow {
  mutation_id: string;
  request_fingerprint: string | null;
  http_status: number;
  content_type: string;
  response_body: string | null;
  response_payload: unknown;
  created_at: string;
}

const MAX_ENTRIES = 1_000;
const TTL_MS = 15 * 60 * 1_000; // 15 minutes

const localCache = new Map<string, StoredIdempotentResponse>();

export function resetIdempotencyStoreForTesting() {
  localCache.clear();
}

function pruneExpired(now: number) {
  for (const [k, v] of localCache.entries()) {
    if (now - v.createdAt > TTL_MS) {
      localCache.delete(k);
    }
  }
  while (localCache.size > MAX_ENTRIES) {
    const oldest = localCache.keys().next().value;
    if (!oldest) break;
    localCache.delete(oldest);
  }
}

export function extractIdempotencyKey(request: Request): string | null {
  const raw = request.headers.get('idempotency-key')?.trim();
  if (!raw || raw.length > 128) return null;
  return raw;
}

export function computePayloadFingerprint(payloadHashInput: unknown): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(payloadHashInput ?? null))
    .digest('hex');
}

function buildConflictResponse(): NextResponse {
  return NextResponse.json(
    {
      error:
        'Idempotency-Key was already used with a different request payload. Generate a fresh key for distinct writes.',
      code: 'IDEMPOTENCY_CONFLICT',
    },
    { status: 409 },
  );
}

export async function runWithIdempotency(
  request: Request,
  options: {
    scope: string;
    actorId: string;
    payloadHashInput: unknown;
    supabase?: SupabaseClient | null;
    draftId?: string | null;
    resultingVersion?: number | null;
    ttlSeconds?: number;
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
  const fingerprint = computePayloadFingerprint(options.payloadHashInput);
  const strict = isStrictPersistenceMode();

  // Resolve authenticated Supabase client for durable v34_idempotency_keys lookup
  let sb: SupabaseClient | null = options.supabase ?? null;
  if (!sb && isUuid(options.actorId)) {
    sb = await getOptionalAuthSupabase();
  }
  const usePostgres = Boolean(sb && isUuid(options.actorId));

  // 1. Durable PostgreSQL idempotency lookup (survives Worker cold starts / multi-isolate routing)
  if (usePostgres && sb) {
    try {
      const remoteRows = await runSupabaseRpc<RemoteIdempotencyRow[]>(
        sb,
        'v34_idempotency_lookup',
        {
          p_scope: options.scope,
          p_composite_key: compositeKey,
        },
        { failClosed: strict },
      );

      const remote = Array.isArray(remoteRows) ? remoteRows[0] : null;
      if (remote) {
        if (remote.request_fingerprint && remote.request_fingerprint !== fingerprint) {
          return buildConflictResponse();
        }
        const bodyText =
          typeof remote.response_body === 'string' && remote.response_body.length > 0
            ? remote.response_body
            : JSON.stringify(remote.response_payload ?? {});
        return new NextResponse(bodyText, {
          status: remote.http_status || 200,
          headers: {
            'Content-Type': remote.content_type || 'application/json',
            'Idempotency-Key': key,
            'X-Idempotency-Replayed': 'true',
            'X-Idempotency-Storage': 'postgres',
          },
        });
      }
    } catch (err) {
      if (err instanceof SupabasePersistenceError && strict) {
        return NextResponse.json(
          { error: err.message, code: err.code },
          { status: err.status },
        );
      }
    }
  } else if (strict && isUuid(options.actorId)) {
    return NextResponse.json(
      {
        error: 'Durable idempotency storage is temporarily unavailable. Please retry shortly.',
        code: 'PERSISTENCE_UNAVAILABLE',
      },
      { status: 503 },
    );
  }

  // 2. Local process cache (dev/test mode or non-UUID local contributor)
  if (!strict) {
    const existing = localCache.get(compositeKey);
    if (existing && now - existing.createdAt <= TTL_MS) {
      if (existing.fingerprint !== fingerprint) {
        return buildConflictResponse();
      }
      return new NextResponse(existing.bodyText, {
        status: existing.status,
        headers: {
          'Content-Type': existing.contentType,
          'Idempotency-Key': key,
          'X-Idempotency-Replayed': 'true',
          'X-Idempotency-Storage': 'memory',
        },
      });
    }
  }

  // 3. Execute underlying mutation handler (mapping fail-closed persistence errors cleanly)
  let response: NextResponse;
  try {
    response = await execute();
  } catch (err) {
    if (err instanceof SupabasePersistenceError) {
      return NextResponse.json(
        { error: err.message, code: err.code, operation: err.operation },
        { status: err.status },
      );
    }
    throw err;
  }

  // Only persist deterministic responses (2xx / 4xx, never transient 5xx)
  if (response.status < 500) {
    const cloned = response.clone();
    const bodyText = await cloned.text();
    const contentType = cloned.headers.get('content-type') || 'application/json';
    let parsedJson: unknown = {};
    try {
      parsedJson = JSON.parse(bodyText);
    } catch {
      parsedJson = { raw: bodyText.slice(0, 512) };
    }

    if (usePostgres && sb) {
      try {
        const stored = await runSupabaseRpc<{ stored?: boolean; conflict?: boolean }>(
          sb,
          'v34_idempotency_store',
          {
            p_composite_key: compositeKey,
            p_scope: options.scope,
            p_fingerprint: fingerprint,
            p_http_status: response.status,
            p_content_type: contentType,
            p_response_body: bodyText,
            p_response_payload: parsedJson,
            p_draft_id: options.draftId ?? null,
            p_resulting_version: options.resultingVersion ?? null,
            p_ttl_seconds: options.ttlSeconds ?? Math.floor(TTL_MS / 1000),
          },
          { failClosed: strict },
        );
        if (stored?.conflict) {
          return buildConflictResponse();
        }
        response.headers.set('X-Idempotency-Storage', 'postgres');
      } catch (err) {
        if (err instanceof SupabasePersistenceError && strict) {
          return NextResponse.json(
            { error: err.message, code: err.code },
            { status: err.status },
          );
        }
      }
    }

    if (!strict) {
      localCache.set(compositeKey, {
        fingerprint,
        status: response.status,
        bodyText,
        contentType,
        createdAt: now,
      });
    }
    response.headers.set('Idempotency-Key', key);
  }
  return response;
}
