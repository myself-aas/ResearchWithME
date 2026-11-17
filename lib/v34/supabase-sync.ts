/**
 * Live Supabase persistence bridge for v3.4 Research Network repositories.
 *
 * Uses the caller's authenticated Supabase server client (respecting RLS,
 * zero service-role keys) for writes and private reads, and the public anon
 * client for public reads. Gracefully degrades to null when Supabase is not
 * configured (local dev / Vitest) or temporarily unreachable, protected by a
 * bounded read timeout and 30-second transport circuit breaker so v3.4 SSR
 * and API latencies remain within §F SLOs during upstream degradation.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createSupabaseServerClient, getSupabasePublicClient } from '@/lib/supabase/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const READ_TIMEOUT_MS = 1_200;
const CIRCUIT_COOLDOWN_MS = 30_000;

let circuitOpenUntil = 0;

export function resetSupabaseCircuitForTesting() {
  circuitOpenUntil = 0;
}

export function isSupabaseCircuitOpen(): boolean {
  return Date.now() < circuitOpenUntil;
}

function tripCircuit() {
  circuitOpenUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
}

function isTransportFailure(err: unknown): boolean {
  const msg = String(
    err && typeof err === 'object' && 'message' in err ? (err as { message: unknown }).message : err,
  ).toLowerCase();
  return (
    msg.includes('fetch failed') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('enotfound') ||
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('abort')
  );
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

export async function runSupabaseMutation(
  client: SupabaseClient | null,
  op: (sb: SupabaseClient) => PromiseLike<{ error: { message: string } | null }>,
): Promise<boolean> {
  if (!client || isSupabaseCircuitOpen()) return false;
  return withSupabaseReadTimeout<boolean>(
    async () => {
      const { error } = await op(client);
      if (error && isTransportFailure(error)) {
        tripCircuit();
      }
      return !error;
    },
    false,
    2_500,
  );
}
