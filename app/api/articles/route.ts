import { NextRequest, NextResponse } from 'next/server';
import { getArticleCatalogue } from '@/lib/cms/catalogue';
import { enforceRateLimit } from '@/lib/v34/http';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const limited = await enforceRateLimit(request, 'articles-list', 120, 60_000);
  if (limited) return limited;
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const format = searchParams.get('format');
    const search = searchParams.get('search');
    const author = searchParams.get('author')?.trim().toLowerCase().slice(0, 120);
    const limitParam = Number.parseInt(searchParams.get('limit') ?? '', 10);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 100;
    const full = searchParams.get('full') === '1';

    // Live CMS posts lead the feed; bundled and local articles follow.
    let articles = await getArticleCatalogue();

    if (category && category !== 'All') {
      articles = articles.filter((article) => article.category === category);
    }
    if (format && format !== 'All') {
      articles = articles.filter((article) => article.format === format);
    }
    if (author) {
      articles = articles.filter(
        (article) => article.author.id.toLowerCase() === author || article.author.name.toLowerCase() === author,
      );
    }
    if (search?.trim()) {
      const query = search.trim().toLowerCase().slice(0, 120);
      articles = articles.filter((article) =>
        [
          article.title,
          article.subtitle,
          article.summary,
          article.author.name,
          ...article.tags,
          article.reviewedArtifact?.identifier ?? '',
          article.reviewedArtifact?.title ?? '',
        ].some((value) => value.toLowerCase().includes(query)),
      );
    }

    // Feed consumers only need metadata; the full body is served by the article route.
    const page = articles.slice(0, limit);
    const payload = full
      ? page
      : page.map(({ content: _content, bodyMarkdown: _bodyMarkdown, ...article }) => article);

    return NextResponse.json(
      { articles: payload, count: articles.length },
      { headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=300' } },
    );
  } catch (error) {
    console.error('Error in GET /api/articles:', error);
    return NextResponse.json({ error: 'The article archive could not be read.' }, { status: 500 });
  }
}
