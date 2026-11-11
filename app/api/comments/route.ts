import { NextRequest, NextResponse } from 'next/server';
import { cmsCommentToRecord } from '@/lib/cms/mapping';
import { getPublishedCmsPostById } from '@/lib/cms/read';
import { fromPublicPostId, normalizeCommentInput } from '@/lib/cms/schema';
import { getPublicCmsStore } from '@/lib/cms/store';
import { getPublicLegacyStore } from '@/lib/legacy/store';
import { isSameOrigin } from '@/lib/cms/http';
import { clientKey, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const postId = request.nextUrl.searchParams.get('postId')?.slice(0, 120);
    const cmsPostId = postId ? fromPublicPostId(postId) : null;

    if (cmsPostId) {
      const store = await getPublicCmsStore();
      const comments = await store.listCommentsForPost(cmsPostId);
      return NextResponse.json(
        { comments: comments.map(cmsCommentToRecord) },
        { headers: { 'Cache-Control': 'public, max-age=15, stale-while-revalidate=60' } },
      );
    }

    let comments;
    try {
      comments = (await getPublicLegacyStore().getComments(postId || undefined)).slice(0, 200);
    } catch (error) {
      console.error('Error reading legacy comments:', error);
      return NextResponse.json({ error: 'Comments could not be read.' }, { status: 503 });
    }
    return NextResponse.json(
      { comments },
      { headers: { 'Cache-Control': 'public, max-age=15, stale-while-revalidate=60' } },
    );
  } catch (error) {
    console.error('Error in GET /api/comments:', error);
    return NextResponse.json({ error: 'Comments could not be read.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-site requests are not allowed.' }, { status: 403 });
  }

  const limit = await rateLimit(clientKey(request, 'comments'), 8, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many comments in a short window. Wait a minute and try again.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  if (!(request.headers.get('content-type') ?? '').includes('application/json')) {
    return NextResponse.json({ error: 'Send the comment as JSON.' }, { status: 415 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'The comment body could not be read.' }, { status: 400 });
  }

  const postId = typeof body.postId === 'string' ? body.postId.slice(0, 120) : '';
  if (!postId) return NextResponse.json({ error: 'A post id is required.' }, { status: 400 });

  const parsed = normalizeCommentInput({
    authorName: body.authorName,
    authorRole: body.authorRole,
    content: body.text,
  });
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.message, fieldErrors: parsed.fieldErrors },
      { status: 400 },
    );
  }

  // CMS articles live in Supabase (or the local CMS archive in demo mode).
  const cmsPostId = fromPublicPostId(postId);
  if (cmsPostId) {
    try {
      const post = await getPublishedCmsPostById(cmsPostId);
      if (!post) {
        return NextResponse.json({ error: 'That article does not exist.' }, { status: 404 });
      }

      const store = await getPublicCmsStore();
      const comment = await store.createComment(cmsPostId, parsed.value);
      return NextResponse.json({ success: true, comment: cmsCommentToRecord(comment) }, { status: 201 });
    } catch (error) {
      console.error('Error saving a CMS comment:', error);
      return NextResponse.json(
        { error: 'The comment could not be saved. Your text is still in the form.' },
        { status: 503 },
      );
    }
  }

  const legacy = getPublicLegacyStore();
  let article;
  try {
    article = await legacy.findArticle(postId);
  } catch (error) {
    console.error('Error reading the legacy catalogue:', error);
    return NextResponse.json(
      { error: 'The comment could not be saved. Your text is still in the form.' },
      { status: 503 },
    );
  }
  if (!article) return NextResponse.json({ error: 'That article does not exist.' }, { status: 404 });

  try {
    const comment = await legacy.addComment(article.id, {
      authorName: parsed.value.authorName,
      authorRole: parsed.value.authorRole,
      content: parsed.value.content,
    });
    return NextResponse.json({ success: true, comment }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/comments:', error);
    return NextResponse.json(
      { error: 'The comment could not be saved. Your text is still in the form.' },
      { status: 503 },
    );
  }
}
