import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { MAX_ACTIVE_KEYS } from './keys';

/**
 * Where API keys live.
 *
 * Two paths, on purpose:
 *   - `list`, `create`, `revoke` run as the signed-in owner under row-level
 *     security. Column grants keep the hash unreadable and make `revoked_at`
 *     the only writable column (supabase/migrations/20261114000200_api_keys.sql).
 *   - `lookup` has no session to run as: the caller is presenting the key. It
 *     goes through `api_key_lookup`, gated by the bridge secret.
 */

export interface ApiKeyRecord {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface ApiKeyIdentity {
  keyId: string;
  userId: string;
}

export interface ApiKeyStore {
  list(userId: string): Promise<ApiKeyRecord[]>;
  create(userId: string, input: { name: string; prefix: string; keyHash: string }): Promise<ApiKeyRecord | 'LIMIT_REACHED'>;
  revoke(userId: string, keyId: string): Promise<boolean>;
  lookup(keyHash: string): Promise<ApiKeyIdentity | null>;
}

export class ApiStoreUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiStoreUnavailableError';
  }
}

/**
 * The API's bridge secret. Empty means the database refuses every call.
 */
export function bridgeSecret(): string {
  return (process.env.API_BRIDGE_SECRET ?? '').trim();
}

interface MemoryKey extends ApiKeyRecord {
  userId: string;
  keyHash: string;
}

/** For unit tests and for `next dev` without Supabase. Not shared between isolates. */
export function createMemoryApiKeyStore(now: () => Date = () => new Date()): ApiKeyStore {
  const keys: MemoryKey[] = [];
  const publicView = ({ id, name, prefix, createdAt, lastUsedAt, revokedAt }: MemoryKey): ApiKeyRecord => ({
    id, name, prefix, createdAt, lastUsedAt, revokedAt,
  });

  return {
    async list(userId) {
      return keys.filter((key) => key.userId === userId).map(publicView);
    },
    async create(userId, input) {
      const active = keys.filter((key) => key.userId === userId && key.revokedAt === null).length;
      if (active >= MAX_ACTIVE_KEYS) return 'LIMIT_REACHED';
      const key: MemoryKey = {
        id: crypto.randomUUID(),
        userId,
        name: input.name,
        prefix: input.prefix,
        keyHash: input.keyHash,
        createdAt: now().toISOString(),
        lastUsedAt: null,
        revokedAt: null,
      };
      keys.push(key);
      return publicView(key);
    },
    async revoke(userId, keyId) {
      const key = keys.find((entry) => entry.id === keyId && entry.userId === userId && entry.revokedAt === null);
      if (!key) return false;
      key.revokedAt = now().toISOString();
      return true;
    },
    async lookup(keyHash) {
      const key = keys.find((entry) => entry.keyHash === keyHash && entry.revokedAt === null);
      if (!key) return null;
      key.lastUsedAt = now().toISOString();
      return { keyId: key.id, userId: key.userId };
    },
  };
}

const COLUMNS = 'id, name, prefix, created_at, last_used_at, revoked_at';

interface KeyRow {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

function fromRow(row: KeyRow): ApiKeyRecord {
  return {
    id: row.id,
    name: row.name,
    prefix: row.prefix,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    revokedAt: row.revoked_at,
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * @param sessionClient the signed-in owner's client (cookies), for the RLS path
 * @param bridgeClient  a stateless client, for the secret-gated lookup
 */
export function createSupabaseApiKeyStore(
  sessionClient: () => Promise<SupabaseClient>,
  bridgeClient: () => Promise<SupabaseClient>,
): ApiKeyStore {
  return {
    async list(userId) {
      const client = await sessionClient();
      const { data, error } = await client
        .from('api_keys')
        .select(COLUMNS)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw new ApiStoreUnavailableError(error.message);
      return ((data ?? []) as KeyRow[]).map(fromRow);
    },

    async create(userId, input) {
      const client = await sessionClient();
      const { data, error } = await client
        .from('api_keys')
        .insert({ user_id: userId, name: input.name, prefix: input.prefix, key_hash: input.keyHash })
        .select(COLUMNS)
        .single();
      if (error) {
        if (error.message.includes('api_key_limit')) return 'LIMIT_REACHED';
        throw new ApiStoreUnavailableError(error.message);
      }
      return fromRow(data as KeyRow);
    },

    async revoke(userId, keyId) {
      // A malformed id would be a Postgres cast error, not "no such key".
      if (!UUID.test(keyId)) return false;
      const client = await sessionClient();
      const { data, error } = await client
        .from('api_keys')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', keyId)
        .eq('user_id', userId)
        .is('revoked_at', null)
        .select('id');
      if (error) throw new ApiStoreUnavailableError(error.message);
      return (data ?? []).length > 0;
    },

    async lookup(keyHash) {
      const client = await bridgeClient();
      const { data, error } = await client.rpc('api_key_lookup', {
        p_bridge_secret: bridgeSecret(),
        p_key_hash: keyHash,
      });
      if (error) throw new ApiStoreUnavailableError(error.message);
      const identity = data as { keyId?: unknown; userId?: unknown } | null;
      if (!identity || typeof identity.keyId !== 'string' || typeof identity.userId !== 'string') return null;
      return { keyId: identity.keyId, userId: identity.userId };
    },
  };
}

let store: ApiKeyStore | null = null;

export function getApiKeyStore(): ApiKeyStore {
  if (!store) {
    store = isSupabaseConfigured
      ? createSupabaseApiKeyStore(
          async () => (await import('@/lib/supabase/server')).createSupabaseServerClient(),
          async () => (await import('@/lib/supabase/server')).getSupabasePublicClient(),
        )
      : createMemoryApiKeyStore();
  }
  return store;
}

export function setApiKeyStoreForTesting(next: ApiKeyStore | null) {
  store = next;
}
