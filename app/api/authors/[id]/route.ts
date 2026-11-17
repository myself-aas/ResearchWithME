import { NextResponse } from 'next/server';

import { getAuthorArchive } from '@/lib/author-directory';
import { enforceRateLimit } from '@/lib/v34/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * One published profile plus the published articles attributed to it.
 *
 * Shares its query with the author page. It used to read the fabricated roster
 * in lib/blog-data.ts, which has been deleted, so without this it returned 404
 * for every author.
 */
export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'authors-get', 120, 60_000);
  if (limited) return limited;
  try {
    const { id } = await props.params;
    if (!id) {
      return NextResponse.json({ error: 'Author ID is required' }, { status: 400 });
    }

    const archive = await getAuthorArchive(id);
    if (!archive) {
      return NextResponse.json({ error: 'Author not found' }, { status: 404 });
    }

    return NextResponse.json(archive, {
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=600' },
    });
  } catch (err) {
    console.error('Failed to fetch author profile:', err);
    return NextResponse.json({ error: 'Internal server error fetching author' }, { status: 500 });
  }
}
