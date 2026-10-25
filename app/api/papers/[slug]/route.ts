import { NextResponse } from 'next/server';
import { PUBLICATIONS_DATA } from '@/lib/research-data';

export async function GET(
  request: Request,
  props: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await props.params;
    if (!slug) {
      return NextResponse.json({ error: 'Paper slug or ID required' }, { status: 400 });
    }

    const paper = PUBLICATIONS_DATA.find(
      (p) => p.slug === slug || p.id === slug || p.doi.includes(slug)
    );

    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 });
    }

    return NextResponse.json({ paper });
  } catch (err) {
    console.error('Paper detail API error:', err);
    return NextResponse.json({ error: 'Internal server error fetching paper' }, { status: 500 });
  }
}
