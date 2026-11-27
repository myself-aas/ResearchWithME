import { buildArticleMarkdown } from '@/lib/content/markdown';
import { getPostBySlug, getPostSlugs } from '@/lib/content/posts';
import { absoluteUrl } from '@/lib/seo';

/**
 * The markdown representation of an essay.
 *
 * This exists so the `<link rel="alternate" type="text/markdown">` in the page
 * head points at something real, whether or not a CDN is configured to convert
 * HTML on the fly. It is the same source the HTML renders from — not a forked,
 * agent-only copy. Canonical stays on the HTML article and the markdown URL is
 * `noindex`, so there is exactly one indexable address per essay.
 */
export const dynamic = 'force-static';

export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export const dynamicParams = false;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return new Response('# Not found\n\nNo essay lives at this address.\n', {
      status: 404,
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    });
  }

  const body = buildArticleMarkdown(post);

  return new Response(body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Location': absoluteUrl(post.href),
      Link: `<${absoluteUrl(post.href)}>; rel="canonical"`,
      'X-Robots-Tag': 'noindex',
      'X-Markdown-Tokens': String(estimateTokens(body)),
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
