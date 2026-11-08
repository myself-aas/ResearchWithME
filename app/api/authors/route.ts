import { NextResponse } from 'next/server';

import { listPublishedAuthors } from '@/lib/author-directory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Published author profiles. Shares its query with app/author/[id]/page.tsx via
 * lib/author-directory.ts -- see the note there on why neither entry point
 * fetches the other.
 */
export async function GET() {
  try {
    const authors = await listPublishedAuthors();
    return NextResponse.json(
      { authors },
      { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=600' } },
    );
  } catch (err) {
    console.error('Failed to fetch authors:', err);
    return NextResponse.json({ error: 'Internal server error fetching authors' }, { status: 500 });
  }
}
