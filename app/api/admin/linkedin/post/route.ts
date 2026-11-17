import { NextRequest, NextResponse } from 'next/server';
import { postArticleToLinkedIn } from '@/lib/linkedin/automation';
import { extractArticleForLinkedIn } from '@/lib/linkedin/article-extractor';
import { requireEditorInChief } from '@/lib/cms/auth';
import { isSameOrigin, noStoreHeaders, readJsonBody } from '@/lib/cms/http';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-site requests are not allowed.' }, { status: 403, headers: noStoreHeaders() });
  }

  const gate = await requireEditorInChief();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status, headers: noStoreHeaders() });
  }

  const limit = await rateLimit(clientKey(request, 'linkedin:post'), 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many LinkedIn posting attempts. Wait a minute and try again.' },
      { status: 429, headers: { ...noStoreHeaders(), 'Retry-After': String(limit.retryAfter) } },
    );
  }

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const input = (body.value ?? {}) as Record<string, unknown>;
  const slug = typeof input.slug === 'string' ? input.slug.trim().slice(0, 200) : '';
  const force = input.force === true;

  if (!slug) {
    return NextResponse.json({ error: 'Article slug is required.' }, { status: 400, headers: noStoreHeaders() });
  }

  // Enforce editorial-only policy before attempting LinkedIn dispatch.
  const anyArticle = await extractArticleForLinkedIn(slug, { requireEditorial: false });
  if (!anyArticle) {
    return NextResponse.json({ error: 'Published article not found.' }, { status: 404, headers: noStoreHeaders() });
  }
  if (anyArticle.publicationType !== 'editorial') {
    return NextResponse.json(
      { error: 'LinkedIn automation is restricted to Editorial posts only.' },
      { status: 422, headers: noStoreHeaders() },
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const result = await postArticleToLinkedIn(slug, {
      client: supabase as unknown as Parameters<typeof postArticleToLinkedIn>[1] extends { client?: infer C } ? C : never,
      force,
    });

    if (result.success) {
      return NextResponse.json(
        { success: true, skipped: Boolean(result.skipped), postUrn: result.postUrn },
        { headers: noStoreHeaders() },
      );
    }

    return NextResponse.json(
      { success: false, error: result.error || 'Failed to publish editorial to LinkedIn.' },
      { status: 502, headers: noStoreHeaders() },
    );
  } catch (error) {
    console.error('[LinkedIn Post] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to post editorial to LinkedIn.' },
      { status: 500, headers: noStoreHeaders() },
    );
  }
}
