import { NextRequest, NextResponse } from 'next/server';
import { getArticles, addArticle } from '@/lib/db';
import { BlogPost } from '@/lib/blog-data';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const format = searchParams.get('format');
    const search = searchParams.get('search');

    let articles = getArticles();

    if (category && category !== 'All') {
      articles = articles.filter((a) => a.category === category);
    }

    if (format && format !== 'All') {
      articles = articles.filter((a) => a.format === format);
    }

    if (search && search.trim()) {
      const q = search.toLowerCase();
      articles = articles.filter((a) =>
        a.title.toLowerCase().includes(q) ||
        a.subtitle.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.author.name.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q)) ||
        (a.reviewedArtifact && (
          a.reviewedArtifact.identifier.toLowerCase().includes(q) ||
          a.reviewedArtifact.title.toLowerCase().includes(q)
        ))
      );
    }

    return NextResponse.json({ articles, count: articles.length });
  } catch (err: unknown) {
    console.error('Error in GET /api/articles:', err);
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: BlogPost = await req.json();

    if (!body.title || !body.summary || !body.content || body.content.length === 0) {
      return NextResponse.json({ error: 'Missing required article fields' }, { status: 400 });
    }

    // Generate unique slug and id if not provided
    const slug = body.slug || body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const id = body.id || 'post-' + Date.now();

    const articleToSave: BlogPost = {
      ...body,
      id,
      slug,
      coverImage: body.coverImage && body.coverImage.trim() !== '' ? body.coverImage : '/images/folio-hero.jpeg',
      readTime: body.readTime && body.readTime.trim() !== '' ? body.readTime : '6 min read',
      publishedAt: body.publishedAt || 'Just now',
      likes: body.likes || 1,
      commentsCount: body.commentsCount || 0,
    };

    const saved = addArticle(articleToSave);
    return NextResponse.json({ success: true, article: saved }, { status: 201 });
  } catch (err: unknown) {
    console.error('Error in POST /api/articles:', err);
    return NextResponse.json({ error: 'Failed to create article' }, { status: 500 });
  }
}
