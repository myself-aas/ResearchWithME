import { NextRequest, NextResponse } from 'next/server';
import { addArticle } from '@/lib/db';
import { AUTHORS, BlogCategory, type BlogPost, CATEGORIES } from '@/lib/blog-data';
import { cleanText, LIMITS, parseTags, slugify } from '@/lib/validation';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { getArticleCatalogue } from '@/lib/cms/catalogue';
import { isSameOrigin } from '@/lib/cms/http';
import { isLocalCmsMode } from '@/lib/cms/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-site requests are not allowed.' }, { status: 403 });
  }

  if (!isLocalCmsMode()) {
    return NextResponse.json(
      {
        error:
          'This deployment publishes through the Supabase editorial studio. Open /dashboard to write, review, and publish.',
      },
      { status: 403 },
    );
  }

  const limit = rateLimit(clientKey(request, 'articles'), 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many publication attempts. Wait a minute and try again.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  if (!(request.headers.get('content-type') ?? '').includes('application/json')) {
    return NextResponse.json({ error: 'Send the article as JSON.' }, { status: 415 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'The article body could not be read.' }, { status: 400 });
  }

  const title = cleanText(body.title, LIMITS.title);
  const summary = cleanText(body.summary, LIMITS.summary);
  const content = Array.isArray(body.content)
    ? body.content.map((block) => cleanText(block, 40_000)).filter(Boolean)
    : [];
  const keyTakeaways = Array.isArray(body.keyTakeaways)
    ? body.keyTakeaways.map((item) => cleanText(item, 300)).filter(Boolean).slice(0, 8)
    : [];

  if (title.length < 8) {
    return NextResponse.json({ error: 'The article title needs at least 8 characters.' }, { status: 400 });
  }
  if (summary.length < 40) {
    return NextResponse.json({ error: 'The summary needs at least 40 characters.' }, { status: 400 });
  }
  if (content.length === 0) {
    return NextResponse.json({ error: 'The article needs at least one body paragraph.' }, { status: 400 });
  }
  if (keyTakeaways.length === 0) {
    return NextResponse.json({ error: 'Add at least one key takeaway.' }, { status: 400 });
  }

  const category = CATEGORIES.includes(body.category as BlogCategory) ? (body.category as BlogCategory) : 'Research Reviews';
  const formatValue = cleanText(body.format, 40) || 'Deep-Dive Essay';
  const authorId = cleanText((body.author as { id?: unknown } | undefined)?.id, 80);
  const knownAuthor = authorId ? AUTHORS[authorId] : undefined;
  const author = knownAuthor ?? {
    id: slugify(authorId || title) || `author-${Date.now()}`,
    name: cleanText((body.author as { name?: unknown } | undefined)?.name, LIMITS.name) || 'ResearchWithMe contributor',
    avatar: cleanText((body.author as { avatar?: unknown } | undefined)?.avatar, 4) || 'RW',
    role: cleanText((body.author as { role?: unknown } | undefined)?.role, 120) || 'Contributor',
    domain: cleanText((body.author as { domain?: unknown } | undefined)?.domain, 160) || category,
    institution: cleanText((body.author as { institution?: unknown } | undefined)?.institution, 160) || undefined,
    verifiedVia: 'institution' as const,
    verifiedIdentifier: cleanText((body.author as { verifiedIdentifier?: unknown } | undefined)?.verifiedIdentifier, 180) || 'Prototype attestation',
    verifiedTitle: cleanText((body.author as { verifiedTitle?: unknown } | undefined)?.verifiedTitle, 160) || 'Contributor identity on file',
    joinedDate: cleanText((body.author as { joinedDate?: unknown } | undefined)?.joinedDate, 40) || '2026',
    articleCount: 1,
    bio: cleanText((body.author as { bio?: unknown } | undefined)?.bio, 600) || 'Contributor to ResearchWithMe.',
  };

  const artifact = body.reviewedArtifact as Record<string, unknown> | undefined;
  const artifactType = artifact?.type;
  const reviewedArtifact =
    artifact && (artifactType === 'github' || artifactType === 'paper' || artifactType === 'dataset')
      ? {
          type: artifactType as 'github' | 'paper' | 'dataset',
          title: cleanText(artifact.title, 200) || cleanText(artifact.identifier, LIMITS.identifier),
          identifier: cleanText(artifact.identifier, LIMITS.identifier),
          url: /^https?:\/\//i.test(cleanText(artifact.url, LIMITS.url)) ? cleanText(artifact.url, LIMITS.url) : 'https://github.com',
          meta: cleanText(artifact.meta, 200) || 'Metadata supplied by the author',
        }
      : undefined;

  const slug = slugify(cleanText(body.slug, 96) || title);
  if (!slug) {
    return NextResponse.json({ error: 'The title needs a letter or number to build a URL.' }, { status: 400 });
  }

  const article: BlogPost = {
    id: `post-${Date.now()}`,
    slug,
    title,
    subtitle: cleanText(body.subtitle, 400) || summary.slice(0, 140),
    category,
    format: formatValue as BlogPost['format'],
    author,
    publishedAt: new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()),
    readTime: cleanText(body.readTime, 40) || '6 min read',
    coverImage: typeof body.coverImage === 'string' && body.coverImage.startsWith('/images/') ? body.coverImage : '/images/folio-hero.jpeg',
    featured: false,
    reviewedArtifact,
    summary,
    content,
    keyTakeaways,
    tags: parseTags(body.tags),
    likes: 0,
    commentsCount: 0,
  };

  const existing = (await getArticleCatalogue()).find((candidate) => candidate.slug === slug);
  if (existing) {
    return NextResponse.json({ error: 'An article with this URL already exists. Change the title.' }, { status: 409 });
  }

  const saved = addArticle(article);
  return NextResponse.json({ success: true, article: saved }, { status: 201 });
}
