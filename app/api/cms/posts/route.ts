import { NextResponse } from 'next/server';
import { requireEditor } from '@/lib/cms/auth';
import { resolvePublishableAuthor } from '@/lib/cms/authors';
import { normalizePostInput } from '@/lib/cms/schema';
import { errorResponse, isSameOrigin, noStoreHeaders, readJsonBody } from '@/lib/cms/http';
import { revalidateArticle } from '@/lib/cms/revalidate';
import { getEditorCmsStore } from '@/lib/cms/store';
import { clientKey, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireEditor();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const store = await getEditorCmsStore();
    const posts = await store.listPosts();
    return NextResponse.json({ posts, mode: gate.mode }, { headers: noStoreHeaders() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-site requests are not allowed.' }, { status: 403 });
  }

  const gate = await requireEditor();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const limit = await rateLimit(clientKey(request, 'cms:create'), 20, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many saves in a short window. Try again in a minute.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = normalizePostInput(body.value);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.message, fieldErrors: parsed.fieldErrors },
      { status: 400 },
    );
  }

  try {
    // Attribution is server-derived. The byline text comes from the profile, so
    // a request body cannot claim an author name that is not on the profile.
    const author = await resolvePublishableAuthor(parsed.value.authorId);
    const value = { ...parsed.value, authorName: author.displayName };

    const store = await getEditorCmsStore();
    const existingCmsPost = await store.getPostBySlug(value.slug);
    if (existingCmsPost) {
      return NextResponse.json(
        { error: 'An article already uses this URL. Change the title or slug.' },
        { status: 409 },
      );
    }

    const post = await store.createPost(value);
    if (post.status === 'published') revalidateArticle(post.slug);

    return NextResponse.json({ post, mode: gate.mode }, { status: 201, headers: noStoreHeaders() });
  } catch (error) {
    return errorResponse(error);
  }
}
