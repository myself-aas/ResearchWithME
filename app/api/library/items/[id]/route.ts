import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { deleteLibraryItemById, updateLibraryItemById } from '@/lib/v34/store';
import { UpdateLibraryItemDirectInputSchema } from '@/lib/v34/wave8-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-library-items-patch', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, UpdateLibraryItemDirectInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const updated = updateLibraryItemById(auth.actor.id, id, {
    collection: parsed.data.collectionId ?? undefined,
    note: parsed.data.note,
  });
  if (!updated) {
    return NextResponse.json({ error: 'Library item not found.' }, { status: 404 });
  }
  return NextResponse.json({ item: updated });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-library-items-delete', 25, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const ok = deleteLibraryItemById(auth.actor.id, id);
  if (!ok) {
    return NextResponse.json({ error: 'Library item not found.' }, { status: 404 });
  }
  return NextResponse.json({ deleted: true, id });
}
