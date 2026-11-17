import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { UpdateLibraryCollectionInputSchema } from '@/lib/v34/wave8-contracts';
import { deleteLibraryCollection, updateLibraryCollection } from '@/lib/v34/wave8-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-library-collections-patch', 25, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, UpdateLibraryCollectionInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const collection = await updateLibraryCollection({
    id,
    userId: auth.actor.id,
    ...parsed.data,
    supabase: auth.actor.supabase,
  });
  if (!collection) {
    return NextResponse.json({ error: 'Library collection not found.' }, { status: 404 });
  }
  return NextResponse.json({ collection });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-library-collections-delete', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const ok = await deleteLibraryCollection({
    id,
    userId: auth.actor.id,
    supabase: auth.actor.supabase,
  });
  if (!ok) {
    return NextResponse.json({ error: 'Library collection not found.' }, { status: 404 });
  }
  return NextResponse.json({ deleted: true, id });
}
