import { NextRequest, NextResponse } from 'next/server';
import { cmsPostToArticle } from '@/lib/cms/mapping';
import { getPublishedCmsPostById } from '@/lib/cms/read';
import { fromPublicPostId } from '@/lib/cms/schema';
import { getPublicCmsStore } from '@/lib/cms/store';
import { getArticleById, getArticleBySlug, incrementLikes } from '@/lib/db';
import { clientKey, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizeId(value: string) {
  return value.trim().slice(0, 120);
}

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const key = normalizeId(id);
    if (!key) return NextResponse.json({ error: 'An article id is required.' }, { status: 400 });

    const cmsPostId = fromPublicPostId(key);
    if (cmsPostId) {
      const post = await getPublishedCmsPostById(cmsPostId);
      if (!post) return NextResponse.json({ error: 'Article not found.' }, { status: 404 });
      return NextResponse.json(
        { article: cmsPostToArticle(post) },
        { headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=300' } },
      );
    }

    const article = getArticleBySlug(key) ?? getArticleById(key);
    if (!article) return NextResponse.json({ error: 'Article not found.' }, { status: 404 });

    return NextResponse.json(
      { article },
      { headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=300' } },
    );
  } catch (error) {
    console.error('Error fetching article:', error);
    return NextResponse.json({ error: 'The article could not be read.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const limit = await rateLimit(clientKey(request, 'likes'), 30, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many reactions in a short window. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  try {
    const { id } = await props.params;
    const key = normalizeId(id);
    if (!key) return NextResponse.json({ error: 'An article id is required.' }, { status: 400 });

    const cmsPostId = fromPublicPostId(key);
    if (cmsPostId) {
      const post = await getPublishedCmsPostById(cmsPostId);
      if (!post) return NextResponse.json({ error: 'Article not found.' }, { status: 404 });

      const store = await getPublicCmsStore();
      const likes = await store.incrementLikes(cmsPostId);
      return NextResponse.json({ success: true, likes });
    }

    const article = getArticleBySlug(key) ?? getArticleById(key);
    if (!article) return NextResponse.json({ error: 'Article not found.' }, { status: 404 });

    const likes = incrementLikes(article.id);
    return NextResponse.json({ success: true, likes });
  } catch (error) {
    console.error('Error updating article likes:', error);
    return NextResponse.json({ error: 'The reaction could not be recorded.' }, { status: 500 });
  }
}
