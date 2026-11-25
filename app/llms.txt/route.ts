import { getAllPostMeta } from '@/lib/content/posts';
import { absoluteUrl } from '@/lib/seo';
import { AUTHOR, SITE } from '@/lib/site';

/**
 * `/llms.txt` — the human-and-agent-readable index of what is here.
 *
 * This follows the llms.txt convention: an H1, a one-paragraph summary, then
 * annotated links. It is generated from the same content collection as the
 * site, so it cannot list a post that does not exist. It is an index, not a
 * second copy of the writing: every link resolves to the canonical page or to
 * that page's markdown representation.
 */
export const dynamic = 'force-static';

export function GET() {
  const posts = getAllPostMeta();

  const lines = [
    `# ${SITE.name}`,
    '',
    `> ${SITE.description}`,
    '',
    `${SITE.name} is a single-author blog by ${AUTHOR.name}. Every essay is an MDX file in a public`,
    'git repository, rendered at build time. There is no paywall, no account wall, and no',
    'client-only content: the full text is in the initial HTML of each URL.',
    '',
    '## Essays',
    '',
    ...posts.map(
      (post) =>
        `- [${post.title}](${absoluteUrl(post.href)}): ${post.description} (${post.date}${post.updated ? `, updated ${post.updated}` : ''})`,
    ),
    '',
    '## Machine-readable',
    '',
    `- [Sitemap](${absoluteUrl('/sitemap.xml')}): every canonical, indexable URL.`,
    `- [RSS](${absoluteUrl(SITE.feedPath)}): full archive, newest first.`,
    `- [JSON Feed](${absoluteUrl('/feed.json')}): the same items as JSON Feed 1.1.`,
    `- [robots.txt](${absoluteUrl('/robots.txt')}): crawl policy, including named AI crawlers.`,
    '',
    '## Representations',
    '',
    'Each essay is HTML at its canonical URL and markdown at `<canonical>/markdown`,',
    'advertised with `<link rel="alternate" type="text/markdown">`. Both come from the same source.',
    'Markdown responses carry `X-Markdown-Tokens` so agents can budget context before reading.',
    '',
    '## Use',
    '',
    `Text is licensed ${SITE.license}: quote, teach, and remix with attribution to ${AUTHOR.name}.`,
    `- [Assistant](${absoluteUrl('/assistant')}): a browser-side retrieval assistant; answers quote the essays and link to them. No query leaves the reader's browser.`,
    `Citation format: ${AUTHOR.name}. “Title.” ${SITE.name}, YYYY-MM-DD. URL.`,
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
