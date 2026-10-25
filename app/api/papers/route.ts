import { NextResponse } from 'next/server';
import { PUBLICATIONS_DATA, Publication } from '@/lib/research-data';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get('topic');
    const search = searchParams.get('q');
    const sort = searchParams.get('sort') || 'date';

    let papers: Publication[] = [...PUBLICATIONS_DATA];

    if (topic && topic !== 'All' && topic !== 'All Fields') {
      papers = papers.filter((p) => p.topic.toLowerCase() === topic.toLowerCase());
    }

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      papers = papers.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.abstract.toLowerCase().includes(q) ||
          p.doi.toLowerCase().includes(q) ||
          p.authors.some((a) => a.name.toLowerCase().includes(q) || a.affiliation.toLowerCase().includes(q)) ||
          p.keywords.some((k) => k.toLowerCase().includes(q))
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

    return NextResponse.json({
      papers,
      total: papers.length,
    });
  } catch (err) {
    console.error('Papers API error:', err);
    return NextResponse.json({ error: 'Internal server error fetching papers' }, { status: 500 });
  }
}
