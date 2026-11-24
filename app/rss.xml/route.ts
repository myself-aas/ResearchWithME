import { getAllPostMeta } from '@/lib/content/posts';
import { absoluteUrl } from '@/lib/seo';
import { SITE } from '@/lib/site';

export const dynamic = 'force-static';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function pubDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00.000Z`).toUTCString();
}

/** RSS 2.0 feed generated from the same MDX files that render the site. */
export function GET() {
  const posts = getAllPostMeta();
  const lastBuild = posts[0] ? pubDate(posts[0].updated ?? posts[0].date) : new Date().toUTCString();

  const items = posts
    .map(
      (post) => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${absoluteUrl(post.href)}</link>
      <guid isPermaLink="true">${absoluteUrl(post.href)}</guid>
      <pubDate>${pubDate(post.date)}</pubDate>
      <description>${escapeXml(post.description)}</description>
${post.tags.map((tag) => `      <category>${escapeXml(tag)}</category>`).join('\n')}
    </item>`,
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE.name)}</title>
    <link>${SITE.url}</link>
    <description>${escapeXml(SITE.description)}</description>
    <language>en</language>
    <copyright>${escapeXml(`${SITE.license} · ${SITE.name}`)}</copyright>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${absoluteUrl(SITE.feedPath)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
