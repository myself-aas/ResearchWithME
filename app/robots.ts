import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

/**
 * Search and answer engines are all welcome, on the same terms: crawl
 * everything public, index it, quote it with attribution.
 *
 * The named groups exist so a crawler that only reads its own user-agent
 * group still gets an explicit `Allow: /`. `*` is not treated as a fallback by
 * every agent, and a missing group can read as "no opinion" rather than
 * "yes". The intent here matches the `Content-Signal` header set in
 * `next.config.ts`; change both together.
 *
 * `/search` is crawlable on purpose — it carries `noindex`, which a crawler
 * has to fetch the page to see. Blocking it would leave a URL in the index
 * that we told the world not to index.
 */
const CRAWLERS = [
  'Googlebot',
  'Bingbot',
  'DuckDuckBot',
  'Applebot',
  'OAI-SearchBot',
  'GPTBot',
  'ChatGPT-User',
  'ClaudeBot',
  'PerplexityBot',
  'Google-Extended',
] as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      ...CRAWLERS.map((userAgent) => ({ userAgent, allow: '/' })),
      { userAgent: '*', allow: '/' },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
