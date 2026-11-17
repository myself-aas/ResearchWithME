/**
 * Live Supabase persistence bridge for v3.4 Research Network repositories.
 *
 * Wave 17 P0 Hardening:
 *  - Uses the caller's authenticated Supabase server client (respecting RLS,
 *    zero service-role keys) for writes and private reads, and the public anon
 *    client for public reads.
 *  - Strict persistence mode (active whenever a real remote Supabase project is
 *    configured and not explicitly overridden for local/CI demo testing):
 *      * NEVER merges in-memory demo seeds into live production reads.
 *      * FAILS CLOSED on Supabase write failures by throwing
 *        `SupabasePersistenceError` (mapped to HTTP 503/403/409).
 *  - Protected by a bounded read timeout and 30-second transport circuit
 *    breaker so v3.4 SSR and API latencies remain within §F SLOs.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured, SUPABASE_URL } from '@/lib/supabase/config';
import { createSupabaseServerClient, getSupabasePublicClient } from '@/lib/supabase/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const READ_TIMEOUT_MS = 1_200;
const MUTATION_TIMEOUT_MS = 3_000;
const CIRCUIT_COOLDOWN_MS = 30_000;

let circuitOpenUntil = 0;
let strictPersistenceOverride: boolean | null = null;

export type PersistenceErrorCode =
  | 'PERSISTENCE_UNAVAILABLE'
  | 'PERSISTENCE_FORBIDDEN'
  | 'PERSISTENCE_CONFLICT'
  | 'PERSISTENCE_FAILED';

export class SupabasePersistenceError extends Error {
  readonly status: number;
  readonly code: PersistenceErrorCode;
  readonly operation: string;
  readonly causeMessage?: string;

  constructor(options: {
    message: string;
    status: number;
    code: PersistenceErrorCode;
    operation: string;
    causeMessage?: string;
  }) {
    super(options.message);
    this.name = 'SupabasePersistenceError';
    this.status = options.status;
    this.code = options.code;
    this.operation = options.operation;
    this.causeMessage = options.causeMessage;
  }
}

export function resetSupabaseCircuitForTesting() {
  circuitOpenUntil = 0;
}

export function setStrictPersistenceOverrideForTesting(enabled: boolean | null) {
  strictPersistenceOverride = enabled;
}

export function isSupabaseCircuitOpen(): boolean {
  return Date.now() < circuitOpenUntil;
}

function tripCircuit() {
  circuitOpenUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
}

function isLocalDiscardStubUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') &&
      parsed.port === '9'
    );
  } catch {
    return false;
  }
}

/**
 * Returns true when running against a real Supabase database where in-memory
 * demo seeds must NEVER be merged into reads and persistence write errors
 * must fail closed.
 */
const RUNTIME_SUPABASE_URL_ENV = 'NEXT_PUBLIC_SUPABASE_URL';

export function isStrictPersistenceMode(): boolean {
  if (strictPersistenceOverride !== null) return strictPersistenceOverride;
  if (process.env.RWM_STRICT_PERSISTENCE === 'true') return true;
  if (process.env.RWM_STRICT_PERSISTENCE === 'false') return false;
  if (!isSupabaseConfigured) return false;
  if (process.env.RWM_ALLOW_DEMO_SEEDS === 'true') return false;
  // Read via dynamic key so Next.js DefinePlugin does not inline build-time URLs
  // over runtime test/CI stub overrides (e.g. NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9).
  const runtimeUrl = (process.env[RUNTIME_SUPABASE_URL_ENV] ?? SUPABASE_URL).trim();
  if (isLocalDiscardStubUrl(runtimeUrl) || isLocalDiscardStubUrl(SUPABASE_URL)) return false;
  return true;
}

/**
 * Determines whether a repository read may fall back to in-memory demo seeds.
 * - NEVER returns true if the remote Supabase query succeeded (`remote !== null`),
 *   even when the table currently has 0 rows.
 * - NEVER returns true in strict persistence mode.
 */
export function shouldUseDemoSeeds(remoteSucceeded: boolean): boolean {
  if (remoteSucceeded) return false;
  return !isStrictPersistenceMode();
}

function isTransportFailure(err: unknown): boolean {
  const msg = String(
    err && typeof err === 'object' && 'message' in err ? (err as { message: unknown }).message : err,
  ).toLowerCase();
  return (
    msg.includes('fetch failed') ||
    msg.includes('econnreset') ||
    msg.includes('econnrefused') ||
    msg.includes('etimedout') ||
    msg.includes('enotfound') ||
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('abort')
  );
}

function classifyPostgresError(
  error: { message: string; code?: string | null },
  operation: string,
): SupabasePersistenceError {
  const pgCode = error.code ?? '';
  const lower = error.message.toLowerCase();

  if (isTransportFailure(error)) {
    return new SupabasePersistenceError({
      message: `Database unavailable during ${operation}. Please retry shortly.`,
      status: 503,
      code: 'PERSISTENCE_UNAVAILABLE',
      operation,
      causeMessage: error.message,
    });
  }

  if (pgCode === '42501' || lower.includes('row-level security') || lower.includes('permission denied')) {
    return new SupabasePersistenceError({
      message: `Permission denied by database security policy during ${operation}.`,
      status: 403,
      code: 'PERSISTENCE_FORBIDDEN',
      operation,
      causeMessage: error.message,
    });
  }

  if (pgCode === '23505' || lower.includes('duplicate key') || lower.includes('unique constraint')) {
    return new SupabasePersistenceError({
      message: `Conflicting record already exists during ${operation}.`,
      status: 409,
      code: 'PERSISTENCE_CONFLICT',
      operation,
      causeMessage: error.message,
    });
  }

  return new SupabasePersistenceError({
    message: `Database persistence failed during ${operation}.`,
    status: 503,
    code: 'PERSISTENCE_FAILED',
    operation,
    causeMessage: error.message,
  });
}

export async function withSupabaseReadTimeout<T>(
  operation: () => Promise<T>,
  fallback: T,
  timeoutMs = READ_TIMEOUT_MS,
): Promise<T> {
  if (isSupabaseCircuitOpen()) return fallback;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Supabase read timeout')), timeoutMs);
      }),
    ]);
    return result;
  } catch (err) {
    if (isTransportFailure(err)) {
      tripCircuit();
    }
    return fallback;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function isUuid(value: string | null | undefined): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export async function getOptionalAuthSupabase(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured || isSupabaseCircuitOpen()) return null;
  try {
    return await createSupabaseServerClient();
  } catch {
    return null;
  }
}

export function getOptionalPublicSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured || isSupabaseCircuitOpen()) return null;
  try {
    return getSupabasePublicClient();
  } catch {
    return null;
  }
}

export async function runSupabaseQuery<T>(
  client: SupabaseClient | null,
  op: (sb: SupabaseClient) => PromiseLike<{ data: T | null; error: { message: string } | null }>,
): Promise<T | null> {
  if (!client || isSupabaseCircuitOpen()) return null;
  return withSupabaseReadTimeout<T | null>(async () => {
    const { data, error } = await op(client);
    if (error) {
      if (isTransportFailure(error)) {
        tripCircuit();
      }
      return null;
    }
    return data;
  }, null);
}

export interface SupabaseMutationOptions {
  operation?: string;
  /**
   * Fail closed by throwing `SupabasePersistenceError` on failure.
   * Defaults to `true` whenever a live `client` is passed OR `isStrictPersistenceMode()` is active.
   */
  failClosed?: boolean;
  timeoutMs?: number;
}

/**
 * Executes a write against Supabase.
 *
 * Wave 17 P0 fail-closed contract:
 *  - When `isStrictPersistenceMode()` is true OR a live `client` is supplied (and
 *    `failClosed !== false`), ANY missing client, open circuit, timeout, RLS
 *    rejection, or Postgres error throws `SupabasePersistenceError` instead of
 *    silently succeeding with in-memory state.
 *  - In local dev / Vitest (`client === null` and `!isStrictPersistenceMode()`),
 *    returns `false` so local demo storage continues to operate cleanly.
 */
export async function runSupabaseMutation(
  client: SupabaseClient | null | undefined,
  op: (sb: SupabaseClient) => PromiseLike<{ error: { message: string; code?: string | null } | null }>,
  options: SupabaseMutationOptions = {},
): Promise<boolean> {
  const operation = options.operation ?? 'v34_mutation';
  const strict = isStrictPersistenceMode();
  const mustFailClosed = options.failClosed ?? (strict || Boolean(client));

  if (!client) {
    if (strict && options.failClosed !== false) {
      throw new SupabasePersistenceError({
        message: `Authenticated database client unavailable during ${operation}.`,
        status: 503,
        code: 'PERSISTENCE_UNAVAILABLE',
        operation,
      });
    }
    return false;
  }

  if (isSupabaseCircuitOpen()) {
    if (mustFailClosed) {
      throw new SupabasePersistenceError({
        message: `Database circuit breaker open during ${operation}. Please retry shortly.`,
        status: 503,
        code: 'PERSISTENCE_UNAVAILABLE',
        operation,
      });
    }
    return false;
  }

  const timeoutMs = options.timeoutMs ?? MUTATION_TIMEOUT_MS;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      Promise.resolve(op(client)),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Supabase mutation timeout')), timeoutMs);
      }),
    ]);

    if (result.error) {
      if (isTransportFailure(result.error)) {
        tripCircuit();
      }
      if (mustFailClosed) {
        throw classifyPostgresError(result.error, operation);
      }
      return false;
    }

    return true;
  } catch (err) {
    if (err instanceof SupabasePersistenceError) {
      throw err;
    }
    if (isTransportFailure(err)) {
      tripCircuit();
    }
    if (mustFailClosed) {
      const msg = err instanceof Error ? err.message : String(err);
      throw classifyPostgresError({ message: msg }, operation);
    }
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function runSupabaseRpc<T>(
  client: SupabaseClient | null | undefined,
  fnName: string,
  params: Record<string, unknown>,
  options: { timeoutMs?: number; failClosed?: boolean } = {},
): Promise<T | null> {
  const strict = isStrictPersistenceMode();
  const mustFailClosed = options.failClosed ?? false;

  if (!client || isSupabaseCircuitOpen()) {
    if (mustFailClosed && strict) {
      throw new SupabasePersistenceError({
        message: `Database RPC ${fnName} unavailable.`,
        status: 503,
        code: 'PERSISTENCE_UNAVAILABLE',
        operation: `rpc:${fnName}`,
      });
    }
    return null;
  }

  const timeoutMs = options.timeoutMs ?? MUTATION_TIMEOUT_MS;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      Promise.resolve(client.rpc(fnName, params)),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Supabase RPC ${fnName} timeout`)), timeoutMs);
      }),
    ]);

    if (result.error) {
      if (isTransportFailure(result.error)) {
        tripCircuit();
      }
      if (mustFailClosed) {
        throw classifyPostgresError(result.error, `rpc:${fnName}`);
      }
      return null;
    }

    return (result.data as T) ?? null;
  } catch (err) {
    if (err instanceof SupabasePersistenceError) throw err;
    if (isTransportFailure(err)) {
      tripCircuit();
    }
    if (mustFailClosed) {
      const msg = err instanceof Error ? err.message : String(err);
      throw classifyPostgresError({ message: msg }, `rpc:${fnName}`);
    }
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
