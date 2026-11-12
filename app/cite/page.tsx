import type { Metadata } from 'next';
import CitationTool from '@/components/CitationTool';
import { getArticleCatalogue, getCachedFeedArticles } from '@/lib/cms/catalogue';
import { pageMetadata } from '@/lib/seo';

interface CitePageProps {
  searchParams: Promise<{ article?: string }>;
}

export async function generateMetadata({ searchParams }: CitePageProps): Promise<Metadata> {
  const params = await searchParams;
  const articleSlug = typeof params.article === 'string' ? params.article.trim() : '';

  if (articleSlug) {
    const catalogue = await getArticleCatalogue();
    const matched = catalogue.find((item) => item.slug === articleSlug);
    const label = matched ? matched.title : articleSlug;
    const base = pageMetadata({
      title: `Cite: ${label}`,
      description: `Generate formatted BibTeX, RIS, APA, MLA, and Chicago citations for "${label}" from verified ResearchWithMe publication metadata.`,
      path: '/cite',
      type: 'website',
    });
    return {
      ...base,
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  return pageMetadata({
    title: 'Citation Builder — BibTeX, RIS & APA',
    description:
      'Generate verified BibTeX, RIS, APA, MLA, and Chicago citations from any ResearchWithMe publication, DOI record, or custom scholarly source.',
    path: '/cite',
    type: 'website',
  });
}

export default async function CitePage() {
  return <CitationTool initialArticles={await getCachedFeedArticles()} />;
}
