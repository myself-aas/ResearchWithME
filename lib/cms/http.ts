import { NextResponse } from 'next/server';
import { CmsAuthorError, CmsError, CmsValidationError, toCmsError } from './errors';

/**
 * Rejects cross-site browser writes. Non-browser clients that omit Origin are
 * still required to authenticate (or the secret) on the route itself.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  const host = request.headers.get('host');
  if (!host) return false;

  try {
    const originUrl = new URL(origin);
    if (originUrl.host === host) return true;

    const site = process.env.NEXT_PUBLIC_SITE_URL;
    if (site) {
      try {
        if (new URL(site).host === originUrl.host) return true;
      } catch {
        return false;
      }
    }
  } catch {
    return false;
  }

  return false;
}

export async function readJsonBody(
  request: Request,
): Promise<{ ok: true; value: unknown } | { ok: false; response: NextResponse }> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Send this request as JSON.' }, { status: 415 }),
    };
  }

  try {
    return { ok: true, value: await request.json() };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'The request body could not be read.' }, { status: 400 }),
    };
  }
}

export function errorResponse(error: unknown) {
  const cmsError: CmsError = toCmsError(error);
  const body: { error: string; fieldErrors?: Record<string, string> } = { error: cmsError.message };
  if (cmsError instanceof CmsValidationError || cmsError instanceof CmsAuthorError) {
    body.fieldErrors = cmsError.fieldErrors;
  }
  return NextResponse.json(body, { status: cmsError.status });
}

export function noStoreHeaders() {
  return {
    'Cache-Control': 'no-store, max-age=0',
  };
}
