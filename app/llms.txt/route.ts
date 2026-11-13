import { NextResponse } from 'next/server';
import { getArticleCatalogue } from '@/lib/cms/catalogue';
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from '@/lib/seo';

export async function GET() {
  const articles = await getArticleCatalogue();

  const lines = [
    `# ${SITE_NAME}`,
    '',
    `> ${SITE_DESCRIPTION}`,
    '',
    'ResearchWithMe is an open-access review platform publishing paper analyses, benchmark replications, and repository teardowns under CC BY 4.0.',
    '',
    '## Pages',
    `- [Home](${absoluteUrl('/')}): Latest reviews, essays, and repository teardowns.`,
    `- [Markdown catalog](${absoluteUrl('/index.md')}): Plain-Markdown edition of the catalog for AI agents and offline tools.`,
    `- [Writers](${absoluteUrl('/authors')}): Contributors with verifiable ORCID or GitHub identities.`,
    `- [Editor](${absoluteUrl('/editorial-board')}): Editor-in-chief and editorial policy.`,
    `- [Citation builder](${absoluteUrl('/cite')}): Export BibTeX, RIS, APA, MLA, and Chicago citations.`,
    `- [Research assistant](${absoluteUrl('/assistant')}): Q&A grounded in the published catalog.`,
    `- [About](${absoluteUrl('/about')}): Mission and contributor verification workflow.`,
    `- [Contact](${absoluteUrl('/contact')}): Pitches, corrections, and security disclosure.`,
    `- [Privacy](${absoluteUrl('/privacy')}): Reader privacy and local-storage policy.`,
    `- [OpenAPI 3.1 specification](${absoluteUrl('/api/openapi.json')}): Machine-readable API contract.`,
    '',
    '## Published reviews & repository teardowns',
    ...articles.map(
      (article) =>
        `- [${article.title}](${absoluteUrl(`/post/${article.slug}`)}) — ${article.author.name} (${article.category}): ${article.summary}`,
    ),
    '',
  ];

  return new NextResponse(lines.join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
