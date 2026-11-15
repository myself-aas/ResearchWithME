/**
 * The one error shape for `/api/v1/*` and `/api/account/api-keys*`:
 * `{ "error": { "code", "message", "details"? } }`.
 *
 * Older routes return `{ "error": "<sentence>" }` and keep doing so; clients
 * depend on that, and the versioned API is where the structured shape starts.
 */
export type ApiErrorCode =
  | 'INVALID_REQUEST'
  | 'UNAUTHENTICATED'
  | 'NOT_FOUND'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'IDEMPOTENCY_KEY_REUSED'
  | 'IDEMPOTENCY_IN_FLIGHT'
  | 'RATE_LIMITED'
  | 'QUOTA_EXHAUSTED'
  | 'UPSTREAM_UNAVAILABLE'
  | 'INTERNAL';

export const API_ERROR_STATUS: Record<ApiErrorCode, number> = {
  INVALID_REQUEST: 400,
  UNAUTHENTICATED: 401,
  NOT_FOUND: 404,
  UNSUPPORTED_MEDIA_TYPE: 415,
  IDEMPOTENCY_KEY_REUSED: 422,
  IDEMPOTENCY_IN_FLIGHT: 409,
  RATE_LIMITED: 429,
  QUOTA_EXHAUSTED: 429,
  UPSTREAM_UNAVAILABLE: 503,
  INTERNAL: 500,
};

export function apiError(
  code: ApiErrorCode,
  message: string,
  init: { details?: unknown; headers?: HeadersInit } = {},
): Response {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  const error = init.details === undefined ? { code, message } : { code, message, details: init.details };
  return new Response(JSON.stringify({ error }), { status: API_ERROR_STATUS[code], headers });
}

export function apiJson(body: unknown, status = 200, headers?: HeadersInit): Response {
  const merged = new Headers(headers);
  merged.set('Content-Type', 'application/json; charset=utf-8');
  merged.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(body), { status, headers: merged });
}
