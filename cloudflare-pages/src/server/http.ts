import type { RequestContext } from './context';
import { isPublicConfigValid } from './context';
import { CmsAuthorError, CmsValidationError, toCmsError } from '@/lib/cms/errors';
import type { FieldErrors } from '@/lib/cms/types';
import { clientIp } from '@/lib/rate-limit-core';

/**
 * Shared HTTP helpers for the Pages API handlers. Deliberately small and
 * dependency-light; the Next counterparts in lib/cms/http.ts are untouched.
 */

export { clientIp } from '@/lib/rate-limit-core';

export function clientKey(request: Request, scope: string): string {
  return `${scope}:${clientIp(request)}`;
}

/**
 * Rejects cross-site browser writes. Non-browser clients that omit Origin are
 * still required to authenticate (or the secret) on the route itself.
 * Same semantics as lib/cms/http.ts's isSameOrigin, with the site URL passed
 * explicitly instead of read from the environment.
 */
export function isSameOrigin(request: Request, siteUrl: string): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  const host = request.headers.get('host');
  if (!host) return false;

  try {
    const originUrl = new URL(origin);
    if (originUrl.host === host) return true;

    if (siteUrl) {
      try {
        return new URL(siteUrl).host === originUrl.host;
      } catch {
        return false;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Pages fail closed for writes when the deployment has no valid public config:
 * there is no demo database behind the edge, so a write it cannot persist must
 * never report success. Node-local demo mode keeps working — the gate keys on
 * the runtime, not merely on config presence.
 */
export function readOnlyDeploymentResponse(ctx: RequestContext): Response | null {
  if (ctx.runtime === 'pages' && !isPublicConfigValid(ctx.config)) {
    return new Response(
      JSON.stringify({ error: 'This deployment is read-only. Durable storage is not configured.' }),
      { status: 503, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } },
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Editor-studio helpers (Task 8A). Response shapes mirror lib/cms/http.ts's
// Next wrappers exactly; these use native Response and no Next imports.
// ---------------------------------------------------------------------------

export type JsonBodyResult =
  | { ok: true; value: unknown }
  | { ok: false; response: Response };

/** Reads a JSON request body, or answers with the baseline's 415/400 shape. */
export async function readJsonBody(request: Request): Promise<JsonBodyResult> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return {
      ok: false,
      response: jsonResponse({ error: 'Send this request as JSON.' }, 415),
    };
  }

  try {
    return { ok: true, value: await request.json() };
  } catch {
    return {
      ok: false,
      response: jsonResponse({ error: 'The request body could not be read.' }, 400),
    };
  }
}

function jsonResponse(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

/** noStoreHeaders parity with lib/cms/http.ts. */
export function noStoreHeaders(): Record<string, string> {
  return { 'cache-control': 'no-store, max-age=0' };
}

/** Maps CMS errors (including the store's typed 404/409/503) onto responses. */
export function cmsErrorResponse(error: unknown): Response {
  const mapped = toCmsError(error);
  const body: { error: string; fieldErrors?: FieldErrors } = { error: mapped.message };
  if (mapped instanceof CmsValidationError || mapped instanceof CmsAuthorError) {
    body.fieldErrors = mapped.fieldErrors;
  }
  return jsonResponse(body, mapped.status);
}
