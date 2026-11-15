import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { bridgeSecret } from './key-store';

/**
 * The request ledger: one row per API request, and the monthly count.
 *
 * `claim` is the only place allowance is spent and the only place a retry is
 * recognised; both happen in one SQL function (`api_request_claim`) so neither
 * can race. The memory ledger mirrors that function statement for statement
 * and exists for unit tests and for `next dev` without Supabase.
 */

export interface Usage {
  requestsUsed: number;
  requestsIncluded: number;
  requestsRemaining: number;
  /** First instant of the next UTC month, ISO 8601. */
  resetsAt: string;
}

export type ClaimResult =
  | { status: 'CLAIMED'; requestId: string; usage: Usage }
  | { status: 'REPLAY'; response: unknown }
  | { status: 'IN_FLIGHT' }
  | { status: 'MISMATCH' }
  | { status: 'UNKNOWN_KEY' }
  | { status: 'QUOTA_EXHAUSTED'; usage: Usage };

export interface ClaimInput {
  keyId: string;
  idempotencyKey: string;
  requestHash: string;
  included: number;
}

export interface ApiLedger {
  claim(input: ClaimInput): Promise<ClaimResult>;
  complete(requestId: string, mode: 'MODEL' | 'CATALOG', response: unknown): Promise<void>;
  release(requestId: string): Promise<void>;
  usage(userId: string, included: number): Promise<Usage>;
}

export class LedgerUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LedgerUnavailableError';
  }
}

const DEFAULT_INCLUDED = 100;
/** A claim older than this was abandoned by a caller that died; the next retry takes it over. */
const ABANDONED_AFTER_MS = 2 * 60_000;

export function monthlyIncluded(env: Record<string, string | undefined> = process.env): number {
  const raw = (env.API_FREE_MONTHLY_REQUESTS ?? '').trim();
  if (!/^\d+$/.test(raw)) return DEFAULT_INCLUDED;
  return Number(raw);
}

export function periodReset(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

function periodKey(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function usageOf(used: number, included: number, now: Date): Usage {
  const ceiling = Math.max(included, 0);
  return {
    requestsUsed: used,
    requestsIncluded: ceiling,
    requestsRemaining: Math.max(ceiling - used, 0),
    resetsAt: periodReset(now),
  };
}

interface MemoryRequest {
  id: string;
  userId: string;
  requestHash: string;
  status: 'claimed' | 'completed';
  response: unknown;
  createdAt: number;
  period: string;
}

/**
 * @param resolveUser maps a key id to its account, as `api_keys.user_id` does
 *   in SQL. Defaults to identity, which gives each key its own allowance.
 */
export function createMemoryLedger(
  now: () => Date = () => new Date(),
  resolveUser: (keyId: string) => string | null = (keyId) => keyId,
): ApiLedger {
  const requests = new Map<string, MemoryRequest>();
  const byId = new Map<string, string>();
  const periods = new Map<string, number>();
  const usedBy = (userId: string, period: string) => periods.get(`${userId}:${period}`) ?? 0;

  return {
    async claim({ keyId, idempotencyKey, requestHash, included }) {
      const userId = resolveUser(keyId);
      if (!userId) return { status: 'UNKNOWN_KEY' };
      const at = now();
      const period = periodKey(at);
      const slot = `${keyId}:${idempotencyKey}`;
      const existing = requests.get(slot);

      if (existing) {
        if (existing.requestHash !== requestHash) return { status: 'MISMATCH' };
        if (existing.status === 'completed') return { status: 'REPLAY', response: existing.response };
        if (at.getTime() - existing.createdAt < ABANDONED_AFTER_MS) return { status: 'IN_FLIGHT' };
        existing.createdAt = at.getTime();
        return { status: 'CLAIMED', requestId: existing.id, usage: usageOf(usedBy(userId, period), included, at) };
      }

      const used = usedBy(userId, period);
      if (included < 1 || used >= included) {
        return { status: 'QUOTA_EXHAUSTED', usage: usageOf(Math.max(included, 0), included, at) };
      }
      periods.set(`${userId}:${period}`, used + 1);
      const id = crypto.randomUUID();
      requests.set(slot, { id, userId, requestHash, status: 'claimed', response: null, createdAt: at.getTime(), period });
      byId.set(id, slot);
      return { status: 'CLAIMED', requestId: id, usage: usageOf(used + 1, included, at) };
    },

    async complete(requestId, _mode, response) {
      const slot = byId.get(requestId);
      const request = slot ? requests.get(slot) : undefined;
      if (!request || request.status !== 'claimed') return;
      request.status = 'completed';
      request.response = response;
    },

    async release(requestId) {
      const slot = byId.get(requestId);
      const request = slot ? requests.get(slot) : undefined;
      if (!slot || !request || request.status !== 'claimed') return;
      requests.delete(slot);
      byId.delete(requestId);
      const key = `${request.userId}:${request.period}`;
      periods.set(key, Math.max((periods.get(key) ?? 0) - 1, 0));
    },

    async usage(userId, included) {
      const at = now();
      return usageOf(usedBy(userId, periodKey(at)), included, at);
    },
  };
}

export function createSupabaseLedger(
  clientFactory: () => Promise<SupabaseClient>,
  now: () => Date = () => new Date(),
): ApiLedger {
  async function call(fn: string, args: Record<string, unknown>): Promise<unknown> {
    const client = await clientFactory();
    const { data, error } = await client.rpc(fn, { p_bridge_secret: bridgeSecret(), ...args });
    if (error) throw new LedgerUnavailableError(error.message);
    return data;
  }

  return {
    async claim({ keyId, idempotencyKey, requestHash, included }) {
      const data = (await call('api_request_claim', {
        p_key_id: keyId,
        p_idempotency_key: idempotencyKey,
        p_request_hash: requestHash,
        p_included: included,
      })) as { status?: unknown; requestId?: unknown; used?: unknown; response?: unknown } | null;

      const used = Number(data?.used);
      switch (data?.status) {
        case 'CLAIMED':
          if (typeof data.requestId !== 'string' || !Number.isFinite(used)) break;
          return { status: 'CLAIMED', requestId: data.requestId, usage: usageOf(used, included, now()) };
        case 'QUOTA_EXHAUSTED':
          return { status: 'QUOTA_EXHAUSTED', usage: usageOf(Number.isFinite(used) ? used : Math.max(included, 0), included, now()) };
        case 'REPLAY':
          return { status: 'REPLAY', response: data.response };
        case 'IN_FLIGHT':
        case 'MISMATCH':
        case 'UNKNOWN_KEY':
          return { status: data.status };
      }
      // An answer this code does not understand must not be read as permission.
      throw new LedgerUnavailableError('The usage ledger returned an unrecognised reply.');
    },

    async complete(requestId, mode, response) {
      await call('api_request_complete', { p_request_id: requestId, p_mode: mode, p_response: response });
    },

    async release(requestId) {
      await call('api_request_release', { p_request_id: requestId });
    },

    async usage(userId, included) {
      const used = Number(await call('api_usage', { p_user_id: userId }));
      if (!Number.isFinite(used)) throw new LedgerUnavailableError('The usage ledger returned an unrecognised reply.');
      return usageOf(used, included, now());
    },
  };
}

let ledger: ApiLedger | null = null;

export function getLedger(): ApiLedger {
  if (!ledger) {
    ledger = isSupabaseConfigured
      ? createSupabaseLedger(async () => (await import('@/lib/supabase/server')).getSupabasePublicClient())
      : createMemoryLedger();
  }
  return ledger;
}

export function setLedgerForTesting(next: ApiLedger | null) {
  ledger = next;
}
