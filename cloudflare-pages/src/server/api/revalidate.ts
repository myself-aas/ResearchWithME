import type { AppEnv, RequestContext } from '../context';
import { rateLimit } from '../context';
import { clientKey } from '../http';
import { json, type ApiRoute, type ApiHandler } from './registry';
import { isValidSecret } from '@/lib/cms/secret-core';

interface WebhookPayload {
  type?: string;
  table?: string;
  record?: { slug?: unknown } | null;
  old_record?: { slug?: unknown } | null;
}

/** REVALIDATE_SECRET with the legacy MY_SECRET_TOKEN accepted (parity with Next). */
function configuredRevalidateSecret(env: AppEnv): string {
  return (env.REVALIDATE_SECRET || env.MY_SECRET_TOKEN || '').trim();
}

/**
 * The Pages spike serves every response with an uncached policy (Task 14B's
 * uncached policy holds), so there is no cache layer to evict yet — this is a
 * deliberate no-op whose signature mirrors the Next wrapper (lib/cms/revalidate.ts)
 * until a cache exists. The webhook's response contract is unchanged.
 */
export async function revalidateArticle(
  _ctx: RequestContext,
  _slug?: string | null,
): Promise<void> {
  // no-op by design; see the doc block above
}

/**
 * Cache-eviction webhook for Supabase database webhooks.
 *
 * Configure the webhook with the header `x-revalidate-secret: <REVALIDATE_SECRET>`
 * instead of putting the secret in the URL, so it never lands in access logs.
 * Response shape is byte-compatible with the Next handler, including the legacy
 * ?secret= query parameter.
 */
const revalidate: ApiHandler = async (ctx) => {
  const expected = configuredRevalidateSecret(ctx.env);
  if (!expected) {
    return json(
      { error: 'Revalidation is not configured. Set REVALIDATE_SECRET on the deployment.' },
      { status: 503 },
    );
  }

  const limit = await rateLimit(ctx, clientKey(ctx.request, 'revalidate'), 60, 60_000);
  if (!limit.allowed) {
    return json(
      { error: 'Too many revalidation calls.' },
      { status: 429, headers: { 'retry-after': String(limit.retryAfter) } },
    );
  }

  const headerSecret = ctx.request.headers.get('x-revalidate-secret');
  const querySecret = new URL(ctx.request.url).searchParams.get('secret');
  if (!isValidSecret(headerSecret ?? querySecret, expected)) {
    return json({ error: 'Invalid token.' }, { status: 401 });
  }

  let payload: WebhookPayload | null = null;
  try {
    payload = (await ctx.request.json()) as WebhookPayload;
  } catch {
    payload = null;
  }

  const slugCandidate = payload?.record?.slug ?? payload?.old_record?.slug;
  const slug =
    typeof slugCandidate === 'string' && /^[a-z0-9-]{1,96}$/.test(slugCandidate)
      ? slugCandidate
      : null;

  try {
    await revalidateArticle(ctx, slug);
    return json({
      revalidated: true,
      table: payload?.table ?? null,
      paths: slug ? ['/', '/sitemap.xml', `/post/${slug}`] : ['/', '/sitemap.xml'],
      now: Date.now(),
    });
  } catch (error) {
    console.error('Revalidation failed:', error);
    return json({ error: 'The cache could not be revalidated.' }, { status: 500 });
  }
};

export const revalidateRoutes: ApiRoute[] = [
  { path: '/api/revalidate', handlers: { POST: revalidate } },
];
