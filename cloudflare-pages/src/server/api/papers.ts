import type { Publication } from '@/lib/research-data';
import type { RequestContext } from '../context';
import { json, type ApiRoute, type ApiHandler } from './registry';

const PAPER_CACHE = 'public, max-age=60, stale-while-revalidate=600';

const listPapers: ApiHandler = async (ctx: RequestContext) => {
  try {
    const { searchParams } = new URL(ctx.request.url);
    const topic = searchParams.get('topic');
    const search = searchParams.get('q')?.slice(0, 120);
    const sort = searchParams.get('sort') || 'date';

    let papers: Publication[] = [...ctx.services.listPapers()];

    if (topic && topic !== 'All' && topic !== 'All Fields') {
      papers = papers.filter((paper) => paper.topic.toLowerCase() === topic.toLowerCase());
    }

    if (search && search.trim()) {
      const query = search.toLowerCase().trim();
      papers = papers.filter(
        (paper) =>
          paper.title.toLowerCase().includes(query) ||
          paper.abstract.toLowerCase().includes(query) ||
          paper.doi.toLowerCase().includes(query) ||
          paper.authors.some(
            (author) =>
              author.name.toLowerCase().includes(query) ||
              author.affiliation.toLowerCase().includes(query),
          ) ||
          paper.keywords.some((keyword) => keyword.toLowerCase().includes(query)),
      );
    }

    if (sort === 'citations') {
      papers.sort((a, b) => b.citationCount - a.citationCount);
    } else if (sort === 'title') {
      papers.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      // default: newest first
      papers.sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
    }

    return json(
      { papers, total: papers.length },
      { headers: { 'cache-control': PAPER_CACHE } },
    );
  } catch (error) {
    console.error('Papers API error:', error);
    return json({ error: 'Internal server error fetching papers' }, { status: 500 });
  }
};

const getPaper: ApiHandler = async (ctx: RequestContext, params) => {
  try {
    const slug = (params.slug ?? '').trim().slice(0, 300);
    if (!slug) return json({ error: 'Paper slug or ID required' }, { status: 400 });

    const paper = ctx.services
      .listPapers()
      .find((candidate) => candidate.slug === slug || candidate.id === slug || candidate.doi.includes(slug));

    if (!paper) {
      return json({ error: 'Paper not found' }, { status: 404 });
    }

    return json({ paper }, { headers: { 'cache-control': PAPER_CACHE } });
  } catch (error) {
    console.error('Paper detail API error:', error);
    return json({ error: 'Internal server error fetching paper' }, { status: 500 });
  }
};

export const papersRoutes: ApiRoute[] = [
  { path: '/api/papers', handlers: { GET: listPapers } },
  { path: '/api/papers/:slug', handlers: { GET: getPaper } },
];
