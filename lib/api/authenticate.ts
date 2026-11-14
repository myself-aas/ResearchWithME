import 'server-only';

import { clientKey, rateLimit } from '@/lib/rate-limit';
import { apiError } from './errors';
import { getApiKeyStore, type ApiKeyIdentity } from './key-store';
import { hashApiKey, parseBearer } from './keys';

/** Failed attempts allowed per address per minute before the answer becomes 429. */
const FAILED_ATTEMPTS = 60;

function rateLimited(retryAfter: number): Response {
  return apiError('RATE_LIMITED', `Too many requests. Retry after ${retryAfter} seconds.`, {
    details: { retryAfterSeconds: retryAfter },
    headers: { 'Retry-After': String(retryAfter) },
  });
}

/**
 * Turns `Authorization: Bearer rwm_…` into the key's identity.
 *
 * Runs before the body is read. A missing, malformed, unknown, or revoked key
 * gets one indistinguishable 401, so a response never confirms that a key
 * existed. Only failures count against the per-address limit: several clients
 * behind one address, each with a valid key, are limited per key instead
 * (lib/api/burst.ts).
 */
export async function authenticateApiRequest(
  request: Request,
): Promise<{ ok: true; identity: ApiKeyIdentity } | { ok: false; response: Response }> {
  const key = parseBearer(request.headers.get('authorization'));

  let identity: ApiKeyIdentity | null = null;
  if (key) {
    try {
      identity = await getApiKeyStore().lookup(await hashApiKey(key));
    } catch (error) {
      // "Cannot check" is not "wrong key": a 401 here would make clients discard good keys.
      console.error('API key lookup failed:', error instanceof Error ? error.message : error);
      return {
        ok: false,
        response: apiError('UPSTREAM_UNAVAILABLE', 'Keys cannot be checked right now. Try again shortly.'),
      };
    }
  }
  if (identity) return { ok: true, identity };

  const attempts = await rateLimit(clientKey(request, 'api-auth'), FAILED_ATTEMPTS, 60_000);
  if (!attempts.allowed) return { ok: false, response: rateLimited(attempts.retryAfter) };
  return {
    ok: false,
    response: apiError('UNAUTHENTICATED', 'A valid API key is required.', { headers: { 'WWW-Authenticate': 'Bearer' } }),
  };
}

export { rateLimited };
