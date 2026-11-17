import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { CreateLibraryCollectionInputSchema } from '@/lib/v34/wave8-contracts';
import { createLibraryCollection, listLibraryCollections } from '@/lib/v34/wave8-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-library-collections-list', 40, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const collections = listLibraryCollections(auth.actor.id);
  return NextResponse.json({ collections, total: collections.length });
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-library-collections-create', 25, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, CreateLibraryCollectionInputSchema);
  if (!parsed.ok) return parsed.response;

  const collection = await createLibraryCollection({
    userId: auth.actor.id,
    ...parsed.data,
    supabase: auth.actor.supabase,
  });
  return NextResponse.json({ collection }, { status: 201 });
}
