import type { MetadataRoute } from 'next';
import { getAllPostMeta, getAllTags } from '@/lib/content/posts';
import { SITE_URL } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPostMeta();
  const tags = getAllTags();
  const newest = posts[0] ? new Date(`${posts[0].updated ?? posts[0].date}T00:00:00.000Z`) : new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: new URL('/', SITE_URL).toString(), lastModified: newest, changeFrequency: 'weekly', priority: 1 },
    { url: new URL('/posts', SITE_URL).toString(), lastModified: newest, changeFrequency: 'weekly', priority: 0.9 },
    { url: new URL('/tags', SITE_URL).toString(), lastModified: newest, changeFrequency: 'monthly', priority: 0.6 },
    { url: new URL('/about', SITE_URL).toString(), changeFrequency: 'yearly', priority: 0.5 },
  ];

  return [
    ...staticRoutes,
    ...posts.map((post) => ({
      url: new URL(post.href, SITE_URL).toString(),
      lastModified: new Date(`${post.updated ?? post.date}T00:00:00.000Z`),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...tags.map((tag) => ({
      url: new URL(`/tags/${tag.slug}`, SITE_URL).toString(),
      lastModified: newest,
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    })),
  ];
}
