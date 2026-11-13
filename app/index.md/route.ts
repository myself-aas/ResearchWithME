import { NextResponse } from 'next/server';
import { listPublishedAuthors } from '@/lib/author-directory';
import { getArticleCatalogue } from '@/lib/cms/catalogue';
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from '@/lib/seo';

export async function GET() {
  const [articles, authors] = await Promise.all([
    getArticleCatalogue(),
    listPublishedAuthors(),
  ]);

  const lines = [
    `# ${SITE_NAME} — Open-Access Research Reviews & Repository Teardowns`,
    '',
    SITE_DESCRIPTION,
    '',
    'All reviews, benchmark replications, and bibliographic metadata are published under Creative Commons Attribution 4.0 International (CC BY 4.0) with zero paywalls.',
    '',
    '## Featured & Recent Reviews',
    '',
    ...articles.flatMap((article) => [
      `### [${article.title}](${absoluteUrl(`/post/${article.slug}`)})`,
      `- **Author:** [${article.author.name}](${absoluteUrl(`/author/${article.author.id}`)}) (${article.author.role})`,
      `- **Column:** ${article.category} · **Format:** ${article.format} · **Published:** ${article.publishedAt}`,
      `- **Summary:** ${article.summary}`,
      '',
    ]),
    '## Writers',
    '',
    ...authors.map(
      (author) =>
        `- **[${author.name}](${absoluteUrl(`/author/${author.id}`)})** — ${author.role}${author.institution ? `, ${author.institution}` : ''}`,
    ),
    '',
    '## Navigation & Machine Endpoints',
    '',
    `- [LLM Index (/llms.txt)](${absoluteUrl('/llms.txt')})`,
    `- [Writers (/authors)](${absoluteUrl('/authors')})`,
    `- [Cite (/cite)](${absoluteUrl('/cite')})`,
    `- [About (/about)](${absoluteUrl('/about')}) · [Contact (/contact)](${absoluteUrl('/contact')}) · [Privacy (/privacy)](${absoluteUrl('/privacy')}) · [Editor (/editorial-board)](${absoluteUrl('/editorial-board')})`,
    '',
  ];

  return new NextResponse(lines.join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
