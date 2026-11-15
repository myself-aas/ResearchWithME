import type { MetadataRoute } from 'next';
import { listPublishedAuthors } from '@/lib/author-directory';
import { AUTHORS, CATEGORIES, categoryToSlug } from '@/lib/blog-data';
import { getPublishedCmsPosts } from '@/lib/cms/read';
import { SITE_URL, toDate } from '@/lib/seo';

const FALLBACK_DATE = new Date('2026-10-25T00:00:00.000Z');

const staticRoutes = [
  { path: '/', priority: 1, changeFrequency: 'daily' },
  { path: '/authors', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/editorial-board', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/assistant', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/bookmarks', priority: 0.5, changeFrequency: 'weekly' },
  { path: '/cite', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/pricing', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/about', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/privacy', priority: 0.5, changeFrequency: 'yearly' },
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articleSlugs = new Map<string, Date>();

  const [cmsPosts, publishedAuthors] = await Promise.all([
    getPublishedCmsPosts(),
    listPublishedAuthors(),
  ]);
  for (const post of cmsPosts) {
    articleSlugs.set(post.slug, toDate(post.publishedAt ?? post.insertedAt) ?? FALLBACK_DATE);
  }

  const authorIds = new Set<string>(Object.keys(AUTHORS));
  for (const author of publishedAuthors) {
    authorIds.add(author.id);
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
    ...[...authorIds].map((id) => ({
      url: new URL(`/author/${id}`, SITE_URL).toString(),
      lastModified: FALLBACK_DATE,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
