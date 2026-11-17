import { NextRequest, NextResponse } from 'next/server';
import { handleArticlePublished } from '@/lib/linkedin/automation';
import { noStoreHeaders } from '@/lib/cms/http';
import { verifyHmacSha256Signature } from '@/lib/crypto';
import { enforceRateLimit } from '@/lib/v34/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PostWebhookPayload {
  type?: string;
  table?: string;
  record?: {
    status?: string;
    slug?: string;
    publication_type?: string;
  };
  old_record?: {
    status?: string;
    publication_type?: string;
  };
}

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, 'webhook-article-published', 60, 60_000);
  if (limited) return limited;

  const webhookSecret = (process.env.LINKEDIN_WEBHOOK_SECRET ?? '').trim();
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'LinkedIn webhook verification is not configured.' },
      { status: 503, headers: noStoreHeaders() },
    );
  }

  const rawBody = await request.text();
  const signature =
    request.headers.get('x-webhook-signature') ??
    request.headers.get('x-supabase-signature');

  if (!verifyHmacSha256Signature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401, headers: noStoreHeaders() });
  }

  let payload: PostWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as PostWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400, headers: noStoreHeaders() });
  }

  if (payload.table !== 'posts') {
    return NextResponse.json({ received: true, skipped: true, reason: 'ignored_table' }, { headers: noStoreHeaders() });
  }

  const record = payload.record;
  if (!record?.slug || record.status !== 'published') {
    return NextResponse.json({ received: true, skipped: true, reason: 'not_published' }, { headers: noStoreHeaders() });
  }

  // LinkedIn automation applies strictly to Editorial posts only.
  if (record.publication_type !== 'editorial') {
    return NextResponse.json({ received: true, skipped: true, reason: 'not_editorial' }, { headers: noStoreHeaders() });
  }

  const isNewlyPublishedEditorial =
    payload.type === 'INSERT' ||
    (payload.type === 'UPDATE' &&
      (payload.old_record?.status !== 'published' || payload.old_record?.publication_type !== 'editorial'));

  if (!isNewlyPublishedEditorial) {
    return NextResponse.json({ received: true, skipped: true, reason: 'already_published' }, { headers: noStoreHeaders() });
  }

  try {
    const result = await handleArticlePublished(record.slug);
    if (!result.success) {
      console.error(`[LinkedIn Webhook] Failed to publish editorial ${record.slug}:`, result.error);
      return NextResponse.json(
        { received: true, posted: false, error: 'LinkedIn delivery failed.' },
        { status: 502, headers: noStoreHeaders() },
      );
    }

    return NextResponse.json(
      {
        received: true,
        posted: !result.skipped,
        skipped: Boolean(result.skipped),
        postUrn: result.postUrn,
      },
      { headers: noStoreHeaders() },
    );
  } catch (error) {
    console.error('[LinkedIn Webhook] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed.' },
      { status: 500, headers: noStoreHeaders() },
    );
  }
}
