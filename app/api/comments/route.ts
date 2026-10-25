import { NextRequest, NextResponse } from 'next/server';
import { addComment, getArticleById, getArticleBySlug, getComments } from '@/lib/db';
import { cleanText, LIMITS } from '@/lib/validation';
import { clientKey, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const postId = request.nextUrl.searchParams.get('postId')?.slice(0, 120);
    const comments = getComments(postId || undefined).slice(0, 200);
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
  const limit = rateLimit(clientKey(request, 'comments'), 8, 60_000);
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

  const postId = cleanText(body.postId, 120);
  const text = cleanText(body.text, LIMITS.comment);
  const authorName = cleanText(body.authorName, LIMITS.name) || 'Reader';
  const authorRole = cleanText(body.authorRole, 80) || 'Reader';

  if (!postId) return NextResponse.json({ error: 'A post id is required.' }, { status: 400 });
  if (text.length < 2) return NextResponse.json({ error: 'Write at least a short sentence.' }, { status: 400 });
  if (text.length > LIMITS.comment) {
    return NextResponse.json({ error: `Comments are limited to ${LIMITS.comment} characters.` }, { status: 400 });
  }

  const article = getArticleById(postId) ?? getArticleBySlug(postId);
  if (!article) return NextResponse.json({ error: 'That article does not exist.' }, { status: 404 });

  const initials = authorName
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  try {
    const comment = addComment({
      postId: article.id,
      authorName,
      authorRole,
      avatar: initials || 'RD',
      text,
    });
    return NextResponse.json({ success: true, comment }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/comments:', error);
    return NextResponse.json({ error: 'The comment could not be saved.' }, { status: 503 });
  }
}
