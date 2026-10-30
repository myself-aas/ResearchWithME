import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { getAuthorById, getArticlesByAuthor } from '@/lib/db';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    if (!id) {
      return NextResponse.json({ error: 'An author id is required.' }, { status: 400 });
    }

    const author = getAuthorById(id);
    if (!author) {
      return NextResponse.json({ error: 'Author not found.' }, { status: 404 });
    }

    const articles = getArticlesByAuthor(id);

    return NextResponse.json(
      {
      author,
      articles,
      metrics: {
        totalArticles: articles.length,
        totalLikes: articles.reduce((acc, curr) => acc + (curr.likes || 0), 0),
        totalComments: articles.reduce((acc, curr) => acc + (curr.commentsCount || 0), 0),
        domains: Array.from(new Set(articles.map((a) => a.category))),
        reviewedArtifactsCount: articles.filter((a) => a.reviewedArtifact).length,
        },
      },
      { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=600' } },
    );
  } catch (err) {
    console.error('Failed to fetch author profile:', err);
    return NextResponse.json(
      { error: 'The author record could not be loaded.' },
      { status: 500 }
    );
  }
}
