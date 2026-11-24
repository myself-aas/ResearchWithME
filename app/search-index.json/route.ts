import { getSearchIndex } from '@/lib/content/posts';

/**
 * The full-text half of the search index.
 *
 * The search page inlines only titles, descriptions, and tags; bodies live
 * here so the page does not grow with the archive. The browser fetches this
 * once, on intent, and matches locally — no query ever leaves the reader's
 * machine. `noindex` because it is a machine artifact, not a page.
 */
export const dynamic = 'force-static';

export function GET() {
  const docs = getSearchIndex();

  return new Response(JSON.stringify({ version: 1, count: docs.length, docs }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=31536000, stale-while-revalidate=86400',
      'X-Robots-Tag': 'noindex',
    },
  });
}
