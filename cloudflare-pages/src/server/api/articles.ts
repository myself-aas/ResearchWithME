import type { RequestContext } from '../context';
import { rateLimit } from '../context';
import { clientKey, readOnlyDeploymentResponse } from '../http';
import { json, type ApiRoute, type ApiHandler } from './registry';
import { getPublicArticleCatalogue } from '../stores';
import { cmsPostToArticle } from '@/lib/cms/mapping';
import { fromPublicPostId } from '@/lib/cms/schema';
import type { CmsPost } from '@/lib/cms/types';

const ARTICLE_CACHE = 'public, max-age=30, stale-while-revalidate=300';

const listArticles: ApiHandler = async (ctx: RequestContext) => {
  try {
    const { searchParams } = new URL(ctx.request.url);
    const category = searchParams.get('category');
    const format = searchParams.get('format');
    const search = searchParams.get('search');
    const author = searchParams.get('author')?.trim().toLowerCase().slice(0, 120);
    const limitParam = Number.parseInt(searchParams.get('limit') ?? '', 10);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 100;
    const full = searchParams.get('full') === '1';

    // Live CMS posts lead the feed; bundled and local articles follow.
    let articles = await getPublicArticleCatalogue(ctx);

    if (category && category !== 'All') {
      articles = articles.filter((article) => article.category === category);
    }
    if (format && format !== 'All') {
      articles = articles.filter((article) => article.format === format);
    }
    if (author) {
      articles = articles.filter(
        (article) =>
          article.author.id.toLowerCase() === author || article.author.name.toLowerCase() === author,
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

    return json(
      { articles: payload, count: articles.length },
      { headers: { 'cache-control': ARTICLE_CACHE } },
    );
  } catch (error) {
    console.error('Error in GET /api/articles:', error);
    return json({ error: 'The article archive could not be read.' }, { status: 500 });
  }
};

function normalizeId(value: string) {
  return value.trim().slice(0, 120);
}

const getArticle: ApiHandler = async (ctx: RequestContext, params) => {
  try {
    const key = normalizeId(params.id ?? '');
    if (!key) return json({ error: 'An article id is required.' }, { status: 400 });

    const cmsPostId = fromPublicPostId(key);
    if (cmsPostId) {
      let post: CmsPost | null = null;
      try {
        const store = await ctx.services.publicCms(ctx);
        const candidate = await store.getPost(cmsPostId);
        post = candidate?.status === 'published' ? candidate : null;
      } catch (error) {
        // A CMS outage degrades to a 404 (as in lib/cms/read.ts), never to a 5xx for the feed.
        console.error('Error reading the CMS article:', error);
        post = null;
      }
      if (!post) return json({ error: 'Article not found.' }, { status: 404 });
      return json(
        { article: cmsPostToArticle(post) },
        { headers: { 'cache-control': ARTICLE_CACHE } },
      );
    }

    let legacy;
    try {
      legacy = await ctx.services.legacy(ctx);
    } catch (error) {
      console.error('Error reading the legacy catalogue:', error);
      return json({ error: 'The article could not be read.' }, { status: 503 });
    }
    let article;
    try {
      article = await legacy.findArticle(key);
    } catch (error) {
      console.error('Error reading the legacy catalogue:', error);
      return json({ error: 'The article could not be read.' }, { status: 503 });
    }
    if (!article) return json({ error: 'Article not found.' }, { status: 404 });

    return json({ article }, { headers: { 'cache-control': ARTICLE_CACHE } });
  } catch (error) {
    console.error('Error fetching article:', error);
    return json({ error: 'The article could not be read.' }, { status: 500 });
  }
};

const patchArticle: ApiHandler = async (ctx: RequestContext, params) => {
  // Deployment capability first: never spend rate-limit budget on a write
  // this deployment cannot persist.
  const readOnly = readOnlyDeploymentResponse(ctx);
  if (readOnly) return readOnly;

  const limit = await rateLimit(ctx, clientKey(ctx.request, 'likes'), 30, 60_000);
  if (!limit.allowed) {
    return json(
      { error: 'Too many reactions in a short window. Try again shortly.' },
      { status: 429, headers: { 'retry-after': String(limit.retryAfter) } },
    );
  }

  try {
    const key = normalizeId(params.id ?? '');
    if (!key) return json({ error: 'An article id is required.' }, { status: 400 });

    const cmsPostId = fromPublicPostId(key);
    if (cmsPostId) {
      try {
        const store = await ctx.services.publicCms(ctx);
        const candidate = await store.getPost(cmsPostId).catch((error: unknown) => {
          console.error('Error reading the CMS article for a reaction:', error);
          return null;
        });
        const post = candidate?.status === 'published' ? candidate : null;
        if (!post) return json({ error: 'Article not found.' }, { status: 404 });

        try {
          const likes = await store.incrementLikes(cmsPostId);
          return json({ success: true, likes });
        } catch (error) {
          console.error('Error updating CMS article likes:', error);
          return json({ error: 'The reaction could not be recorded.' }, { status: 503 });
        }
      } catch (error) {
        console.error('Error updating CMS article likes:', error);
        return json({ error: 'The reaction could not be recorded.' }, { status: 503 });
      }
    }

    let legacy;
    try {
      legacy = await ctx.services.legacy(ctx);
    } catch (error) {
      console.error('Error reading the legacy catalogue:', error);
      return json({ error: 'The article could not be read.' }, { status: 503 });
    }
    let article;
    try {
      article = await legacy.findArticle(key);
    } catch (error) {
      console.error('Error reading the legacy catalogue:', error);
      return json({ error: 'The article could not be read.' }, { status: 503 });
    }
    if (!article) return json({ error: 'Article not found.' }, { status: 404 });

    try {
      const likes = await legacy.incrementLikes(article.id);
      return json({ success: true, likes });
    } catch (error) {
      console.error('Error updating article likes:', error);
      return json({ error: 'The reaction could not be recorded.' }, { status: 503 });
    }
  } catch (error) {
    console.error('Error updating article likes:', error);
    return json({ error: 'The reaction could not be recorded.' }, { status: 500 });
  }
};

export const articlesRoutes: ApiRoute[] = [
  { path: '/api/articles', handlers: { GET: listArticles } },
  { path: '/api/articles/:id', handlers: { GET: getArticle, PATCH: patchArticle } },
];
