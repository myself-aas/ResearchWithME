import { describe, expect, it } from 'vitest';
import { API_ERROR_STATUS, apiError } from '@/lib/api/errors';

describe('apiError', () => {
  it('serialises the shape, status and headers', async () => {
    const res = apiError('RATE_LIMITED', 'Too many requests. Retry after 12 seconds.', {
      details: { retryAfterSeconds: 12 }, headers: { 'Retry-After': '12' },
    });
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('12');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(res.headers.get('Content-Type')).toBe('application/json; charset=utf-8');
    expect(await res.json()).toEqual({
      error: { code: 'RATE_LIMITED', message: 'Too many requests. Retry after 12 seconds.', details: { retryAfterSeconds: 12 } },
    });
  });
  it('omits details when none are given', async () => {
    expect(await apiError('UNAUTHENTICATED', 'A valid API key is required.').json()).toEqual({
      error: { code: 'UNAUTHENTICATED', message: 'A valid API key is required.' },
    });
  });
  it('maps every code to its status', () => {
    expect(API_ERROR_STATUS).toEqual({
      INVALID_REQUEST: 400, UNAUTHENTICATED: 401, NOT_FOUND: 404, UNSUPPORTED_MEDIA_TYPE: 415, IDEMPOTENCY_KEY_REUSED: 422,
      IDEMPOTENCY_IN_FLIGHT: 409, RATE_LIMITED: 429, QUOTA_EXHAUSTED: 429, UPSTREAM_UNAVAILABLE: 503, INTERNAL: 500,
    });
  });
});
