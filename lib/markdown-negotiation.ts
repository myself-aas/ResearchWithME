import { SITE_DESCRIPTION } from './seo';
import { slugToCategory } from './blog-data';
import type { BlogPost } from './blog-data';

/** Only explicit, positive preference for Markdown selects the alternate representation. */
export function wantsMarkdown(accept: string | null): boolean {
  if (!accept) return false;
  const ranges = accept.toLowerCase().split(',').map((entry) => {
    const [type, ...params] = entry.trim().split(';').map((part) => part.trim());
    const quality = params.find((part) => part.startsWith('q='));
    const q = quality ? Number(quality.slice(2)) : 1;
    return { type, q: Number.isFinite(q) && q >= 0 && q <= 1 ? q : 0 };
  });
  const quality = (type: string) => {
    const values = ranges.filter((range) => range.type === type).map((range) => range.q);
    return values.length ? Math.max(...values) : null;
  };
  const markdown = quality('text/markdown') ?? 0;
  // An explicit HTML preference overrides text/* and */*; otherwise their
  // quality applies to HTML as defined by HTTP Accept media-range matching.
  const html = quality('text/html') ?? quality('text/*') ?? quality('*/*') ?? 0;
  return markdown > 0 && markdown >= html;
}

/** Public catalogue pages with a genuine text representation; never protected routes or APIs. */
export function markdownRoute(pathname: string):
  | { kind: 'home' }
  | { kind: 'category'; slug: string }
  | { kind: 'post'; slug: string }
  | null {
  if (pathname === '/') return { kind: 'home' };
  const match = /^\/(post|category)\/([a-zA-Z0-9][a-zA-Z0-9-]{0,119})$/.exec(pathname);
  if (!match) return null;
  return match[1] === 'post' ? { kind: 'post', slug: match[2] } : { kind: 'category', slug: match[2] };
}

function line(value: string): string {
  // CMS fields are data, not Markdown structure. Keep titles and summaries
  // from creating injected headings, links or instructions on list pages.
  return value.replace(/[\r\n]+/g, ' ').replace(/[\\`*_\[\]<>]/g, '\\$&').trim();
}

function articleUrl(article: BlogPost, siteUrl: string) {
  return new URL(`/post/${encodeURIComponent(article.slug)}`, siteUrl).toString();
}

function listPosts(posts: BlogPost[], siteUrl: string): string {
  if (!posts.length) return 'No published reviews found.\n';
  return posts.map((post) =>
    `## [${line(post.title)}](${articleUrl(post, siteUrl)})\n\n` +
    `By ${line(post.author.name)} · ${post.category} · ${post.publishedAt}\n\n` +
    `${line(post.summary)}\n`,
  ).join('\n');
}

export function renderMarkdown(pathname: string, search: string, posts: BlogPost[], siteUrl: string): string | null {
  const route = markdownRoute(pathname);
  if (!route) return null;
  if (route.kind === 'post') {
    const post = posts.find((entry) => entry.slug === route.slug || entry.id === route.slug);
    if (!post) return null;
    const body = post.bodyMarkdown?.trim() || post.content.join('\n\n').trim();
    return [
      `# ${line(post.title)}`,
      `Source: ${articleUrl(post, siteUrl)}`,
      `Author: ${line(post.author.name)}`,
      `Published: ${post.dateISO ?? post.publishedAt}`,
      `Category: ${post.category}`,
      `Format: ${post.format}`,
      post.reviewedArtifact ? `Reviewed artifact: [${line(post.reviewedArtifact.title)}](${post.reviewedArtifact.url})` : '',
      `\n${line(post.summary)}`,
      post.keyTakeaways.length ? `## Key takeaways\n\n${post.keyTakeaways.map((item) => `- ${line(item)}`).join('\n')}` : '',
      body ? `## Article\n\n${body}` : '',
    ].filter(Boolean).join('\n\n').trim() + '\n';
  }

  const category = route.kind === 'category' ? slugToCategory(route.slug) : null;
  if (route.kind === 'category' && !category) return null;
  const query = search.trim().toLowerCase().slice(0, 120);
  const filtered = posts.filter((post) =>
    (!category || post.category === category) &&
    (!query || [post.title, post.subtitle, post.summary, post.author.name,
      post.reviewedArtifact?.identifier ?? '', ...post.tags].some((value) => value.toLowerCase().includes(query))),
  );
  const title = category ? `${category} — ResearchWithMe` : 'ResearchWithMe';
  const url = new URL(pathname, siteUrl).toString();
  return `# ${title}\n\n${category ? `Published ${category} reviews and teardowns.` : SITE_DESCRIPTION}\n\nSource: ${url}\n\n` +
    (query ? `Search: ${line(search.trim().slice(0, 120))}\n\n` : '') +
    `${listPosts(filtered, siteUrl)}`;
}

export function markdownResponse(text: string | null, method: string): Response {
  if (text === null) return new Response(method === 'HEAD' ? null : 'Not found.\n', {
    status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', Vary: 'Accept', 'Cache-Control': 'no-store' },
  });
  return new Response(method === 'HEAD' ? null : text, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      Vary: 'Accept',
      'Cache-Control': 'public, max-age=30, stale-while-revalidate=300',
    },
  });
}
