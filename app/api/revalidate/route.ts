import { NextResponse } from 'next/server';
import { hasRevalidateSecret, isValidRevalidateSecret } from '@/lib/cms/secret';
import { revalidateArticle } from '@/lib/cms/revalidate';
import { clientKey, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface WebhookPayload {
  type?: string;
  table?: string;
  record?: { slug?: unknown } | null;
  old_record?: { slug?: unknown } | null;
}

/**
 * Cache-eviction webhook for Supabase database webhooks.
 *
 * Configure the webhook with the header `x-revalidate-secret: <REVALIDATE_SECRET>`
 * instead of putting the secret in the URL, so it never lands in access logs.
 */
export async function POST(request: Request) {
  if (!hasRevalidateSecret()) {
    return NextResponse.json(
      { error: 'Revalidation is not configured. Set REVALIDATE_SECRET on the deployment.' },
      { status: 503 },
    );
  }

  const limit = await rateLimit(clientKey(request, 'revalidate'), 60, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many revalidation calls.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  const headerSecret = request.headers.get('x-revalidate-secret');
  const querySecret = new URL(request.url).searchParams.get('secret');
  if (!isValidRevalidateSecret(headerSecret ?? querySecret)) {
    return NextResponse.json({ error: 'Invalid token.' }, { status: 401 });
  }

  let payload: WebhookPayload | null = null;
  try {
    payload = (await request.json()) as WebhookPayload;
  } catch {
    payload = null;
  }

  const slugCandidate = payload?.record?.slug ?? payload?.old_record?.slug;
  const slug = typeof slugCandidate === 'string' && /^[a-z0-9-]{1,96}$/.test(slugCandidate) ? slugCandidate : null;

  try {
    revalidateArticle(slug);
    return NextResponse.json({
      revalidated: true,
      table: payload?.table ?? null,
      paths: slug ? ['/', '/sitemap.xml', `/post/${slug}`] : ['/', '/sitemap.xml'],
      now: Date.now(),
    });
  } catch (error) {
    console.error('Revalidation failed:', error);
    return NextResponse.json({ error: 'The cache could not be revalidated.' }, { status: 500 });
  }
}
