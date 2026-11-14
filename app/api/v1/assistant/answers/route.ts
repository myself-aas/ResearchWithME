import { IDEMPOTENCY_KEY_PATTERN, MAX_QUERY, runAnswer } from '@/lib/api/answers';
import { authenticateApiRequest, rateLimited } from '@/lib/api/authenticate';
import { checkBurst } from '@/lib/api/burst';
import { apiError, apiJson } from '@/lib/api/errors';
import { cleanText } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 8192;

/**
 * Contract: docs/assistant-api.md. Cheapest checks first, and nothing is spent
 * until every one of them has passed: key, burst limit, media type, body.
 */
export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  const burst = await checkBurst(auth.identity.keyId);
  if (!burst.allowed) return rateLimited(burst.retryAfter);

  if (!(request.headers.get('content-type') ?? '').toLowerCase().includes('application/json')) {
    return apiError('UNSUPPORTED_MEDIA_TYPE', 'Send the request as application/json.');
  }

  const idempotencyKey = request.headers.get('idempotency-key');
  if (idempotencyKey !== null && !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
    return apiError('INVALID_REQUEST', 'Idempotency-Key must be 8 to 128 characters from A-Z, a-z, 0-9, underscore and hyphen.');
  }

  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) {
    return apiError('INVALID_REQUEST', `The request body must be at most ${MAX_BODY_BYTES} bytes.`);
  }
  let payload: { query?: unknown } | null = null;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
      return apiError('INVALID_REQUEST', `The request body must be at most ${MAX_BODY_BYTES} bytes.`);
    }
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) payload = parsed as { query?: unknown };
  } catch {
    payload = null;
  }
  if (!payload) return apiError('INVALID_REQUEST', 'The request body must be a JSON object.');

  const tooLong = typeof payload.query === 'string' && payload.query.trim().length > MAX_QUERY;
  const query = tooLong ? '' : cleanText(payload.query, MAX_QUERY);
  if (!query) return apiError('INVALID_REQUEST', `query must be 1 to ${MAX_QUERY} characters.`);

  const outcome = await runAnswer({ identity: auth.identity, query, idempotencyKey });
  if (!outcome.ok) {
    return apiError(outcome.code, outcome.message, {
      details: outcome.details,
      headers: outcome.code === 'UNAUTHENTICATED' ? { 'WWW-Authenticate': 'Bearer' } : undefined,
    });
  }
  return apiJson(outcome.body);
}
