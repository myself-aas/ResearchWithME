import { getAllPostMeta } from '@/lib/content/posts';
import { absoluteUrl } from '@/lib/seo';
import { AUTHOR, SITE } from '@/lib/site';

/**
 * JSON Feed 1.1, generated from the same collection as the RSS feed. Two
 * formats, one source of truth: if an item is here it is also in `/rss.xml`.
 */
export const dynamic = 'force-static';

export function GET() {
  const posts = getAllPostMeta();

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: SITE.name,
    home_page_url: SITE.url,
    feed_url: absoluteUrl('/feed.json'),
    description: SITE.description,
    language: SITE.language,
    authors: [{ name: AUTHOR.name, url: absoluteUrl('/about') }],
    items: posts.map((post) => ({
      id: absoluteUrl(post.href),
      url: absoluteUrl(post.href),
      title: post.title,
      summary: post.description,
      date_published: `${post.date}T00:00:00.000Z`,
      ...(post.updated ? { date_modified: `${post.updated}T00:00:00.000Z` } : {}),
      tags: post.tags,
      language: SITE.language,
    })),
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: {
      'Content-Type': 'application/feed+json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
