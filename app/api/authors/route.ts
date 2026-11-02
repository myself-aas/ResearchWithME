import { NextResponse } from 'next/server';

import { getAllAuthors, getArticles } from '@/lib/db';

export async function GET() {
  try {
    const authors = getAllAuthors();
    const articles = getArticles();

    const authorsWithCounts = authors.map((author) => {
      const authorArticles = articles.filter(
        (a) =>
          a.author.id === author.id ||
          a.author.name.toLowerCase() === author.name.toLowerCase()
      );
      return {
        ...author,
        actualArticleCount: authorArticles.length,
      };
    });

    return NextResponse.json(
      { authors: authorsWithCounts },
      { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=600' } },
    );
  } catch (err) {
    console.error('Failed to fetch authors:', err);
    return NextResponse.json(
      { error: 'Internal server error fetching authors' },
      { status: 500 }
    );
  }
}
