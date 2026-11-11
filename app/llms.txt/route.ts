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
    'ResearchWithMe is an open-access scholarly review platform publishing reproducible paper analyses, benchmark replications, and repository teardowns under CC BY 4.0.',
    '',
    '## Core Archive & Reader Tools',
    `- [Home Catalog](${absoluteUrl('/')}): Latest peer reviews, deep-dive essays, and repository teardowns.`,
    `- [Markdown Catalog](${absoluteUrl('/index.md')}): Clean Markdown edition of the ResearchWithMe catalog for AI agents and offline tools.`,
    `- [Papers Archive](${absoluteUrl('/papers')}): Indexed open-access publications, preprints, and formal DOI records.`,
    `- [Domain Specialists](${absoluteUrl('/authors')}): Verified reviewers with ORCID and GitHub provenance.`,
    `- [Editorial Board](${absoluteUrl('/editorial-board')}): Governance, peer-review standards, and editorial oversight.`,
    `- [Quarterly PDF Editions](${absoluteUrl('/editions')}): Print-ready compendiums of reviews and replications.`,
    `- [Citation Builder](${absoluteUrl('/cite')}): Export BibTeX, RIS, APA, MLA, and Chicago citations.`,
    `- [Research Synthesis Assistant](${absoluteUrl('/assistant')}): Grounded Q&A cited directly against the published archive.`,
    `- [About ResearchWithMe](${absoluteUrl('/about')}): Mission, diamond open-access policy, and verification workflow.`,
    `- [Contact Editorial Office](${absoluteUrl('/contact')}): Submissions, corrections, and vulnerability disclosure.`,
    `- [Privacy Policy](${absoluteUrl('/privacy')}): Zero-tracking reader privacy and local-first storage guarantees.`,
    `- [OpenAPI 3.1 Specification](${absoluteUrl('/api/openapi.json')}): Machine-readable API contract.`,
    '',
    '## Published Reviews & Repository Teardowns',
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
