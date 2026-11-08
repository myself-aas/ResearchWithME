import type { MetadataRoute } from 'next';
import { AUTHORS, CATEGORIES, INITIAL_BLOG_POSTS, categoryToSlug } from '@/lib/blog-data';
import { getPublishedCmsPosts } from '@/lib/cms/read';
import { PUBLICATIONS_DATA } from '@/lib/research-data';
import { SITE_URL, toDate } from '@/lib/seo';
import persistedArticles from '@/data/articles.json';

const FALLBACK_DATE = new Date('2026-10-25T00:00:00.000Z');

const staticRoutes = [
  { path: '/', priority: 1, changeFrequency: 'daily' },
  { path: '/papers', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/authors', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/editions', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/editorial-board', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/assistant', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/bookmarks', priority: 0.5, changeFrequency: 'weekly' },
  { path: '/cite', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/submit', priority: 0.6, changeFrequency: 'monthly' },
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articleSlugs = new Map<string, Date>();
  for (const article of INITIAL_BLOG_POSTS) {
    articleSlugs.set(article.slug, toDate(article.publishedAt) ?? FALLBACK_DATE);
  }
  for (const article of persistedArticles as Array<{ slug?: string; publishedAt?: string }>) {
    if (article.slug) articleSlugs.set(article.slug, toDate(article.publishedAt) ?? FALLBACK_DATE);
  }

  // Published CMS articles join the same canonical URLs as the bundled catalogue.
  const cmsPosts = await getPublishedCmsPosts();
  for (const post of cmsPosts) {
    articleSlugs.set(post.slug, toDate(post.publishedAt ?? post.insertedAt) ?? FALLBACK_DATE);
  }

  return [
    ...staticRoutes.map(({ path, priority, changeFrequency }) => ({
      url: new URL(path, SITE_URL).toString(),
      lastModified: FALLBACK_DATE,
      changeFrequency,
      priority,
    })),
    ...CATEGORIES.map((category) => ({
      url: new URL(`/category/${categoryToSlug(category)}`, SITE_URL).toString(),
      lastModified: FALLBACK_DATE,
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    })),
    ...[...articleSlugs].map(([slug, lastModified]) => ({
      url: new URL(`/post/${slug}`, SITE_URL).toString(),
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...PUBLICATIONS_DATA.map((paper) => ({
      url: new URL(`/paper/${paper.slug}`, SITE_URL).toString(),
      lastModified: toDate(paper.publishedDate) ?? FALLBACK_DATE,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...Object.keys(AUTHORS).map((id) => ({
      url: new URL(`/author/${id}`, SITE_URL).toString(),
      lastModified: FALLBACK_DATE,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
