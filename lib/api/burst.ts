import { getCloudflareContext } from '@opennextjs/cloudflare';
import { rateLimit } from '@/lib/rate-limit';

/**
 * Burst limit for the versioned API: stops a runaway loop on one key.
 *
 * Backed by the Workers Rate Limiting binding (`API_BURST_LIMITER` in
 * wrangler.jsonc). That binding is counted per Cloudflare location and is
 * eventually consistent, so some minutes let more than the limit through.
 * Nothing that is counted against an allowance depends on it; the exact count
 * is the ledger's (lib/api/ledger.ts).
 *
 * Without the binding (`next dev`, previews, unit tests) or when it throws, the
 * KV fixed-window limiter takes over, so the limit never silently disappears.
 * That limiter itself fails open on a KV outage, by design (lib/rate-limit-core.ts).
 */
export const BURST_LIMIT = 30;
export const BURST_WINDOW_SECONDS = 60;

export interface RateLimitBindingLike {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

function burstBinding(): RateLimitBindingLike | null {
  try {
    const env = getCloudflareContext().env as Partial<Record<string, unknown>> | undefined;
    const candidate = env?.API_BURST_LIMITER as RateLimitBindingLike | undefined;
    if (candidate && typeof candidate.limit === 'function') return candidate;
  } catch {
    // Outside a Worker request there is no context.
  }
  return null;
}

export async function checkBurst(
  keyId: string,
  binding: RateLimitBindingLike | null | undefined = burstBinding(),
): Promise<{ allowed: boolean; retryAfter: number }> {
  if (binding) {
    try {
      const { success } = await binding.limit({ key: keyId });
      // The binding reports nothing more precise than yes or no.
      return success ? { allowed: true, retryAfter: 0 } : { allowed: false, retryAfter: BURST_WINDOW_SECONDS };
    } catch (error) {
      console.error('API burst limiter binding failed:', error instanceof Error ? error.message : error);
    }
  }
  const outcome = await rateLimit(`api-burst:${keyId}`, BURST_LIMIT, BURST_WINDOW_SECONDS * 1000);
  return { allowed: outcome.allowed, retryAfter: outcome.allowed ? 0 : outcome.retryAfter };
}
