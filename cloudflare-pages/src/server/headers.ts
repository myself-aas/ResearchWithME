import type { RequestContext } from './context';
import { cloneResponseHeaders } from './cookies';

/** Mirrors next.config.ts so both builds send the same policy. */
const SECURITY_HEADERS: Record<string, string> = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'x-dns-prefetch-control': 'on',
  // Deployed on Cloudflare (HTTPS enforced at the edge); HSTS is safe to send.
  'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
  // Report-only CSP: tightens over time without breaking inline bootstrap.
  'content-security-policy-report-only': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "media-src 'self' https:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; '),
};

function withSecurityHeaders(response: Response): { status: number; statusText: string; headers: Headers } {
  const headers = cloneResponseHeaders(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(key)) headers.set(key, value);
  }
  return { status: response.status, statusText: response.statusText, headers };
}

/**
 * Applies the security policy to any response — used on the emergency path
 * where no request context exists (e.g. a misconfigured production deploy).
 */
export function applySecurityHeaders(response: Response): Response {
  const { status, statusText, headers } = withSecurityHeaders(response);
  return new Response(response.body, { status, statusText, headers });
}

/**
 * Finalises a response for the client: security policy, plus the caching rule
 * for responses that carry session cookies — a response that sets cookies must
 * never be served from a shared cache. Existing headers win: handlers may set
 * their own cache-control deliberately.
 */
export function applyHeaders(response: Response, ctx: RequestContext): Response {
  const { status, statusText, headers } = withSecurityHeaders(response);
  if (headers.has('set-cookie') && !headers.has('cache-control')) {
    headers.set('cache-control', 'private, no-store');
  }
  if (ctx.cookies.hasPendingChanges && !headers.has('cache-control')) {
    headers.set('cache-control', 'private, no-store');
  }
  return new Response(response.body, { status, statusText, headers });
}
