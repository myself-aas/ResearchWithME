import { NextResponse } from 'next/server';
import { SaveLibraryItemInputSchema } from '@/lib/v34/contracts';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import {
  listLibraryItems,
  persistLibraryItemToSupabase,
  removeLibraryItem,
  upsertLibraryItem,
} from '@/lib/v34/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const items = listLibraryItems(auth.actor.id);
  return NextResponse.json({ items, total: items.length });
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-library-write', 40, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, SaveLibraryItemInputSchema);
  if (!parsed.ok) return parsed.response;

  const item = upsertLibraryItem(auth.actor.id, parsed.data);
  await persistLibraryItemToSupabase(auth.actor.supabase, item);
  return NextResponse.json({ item }, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const itemType = url.searchParams.get('itemType') ?? '';
  const itemId = url.searchParams.get('itemId') ?? '';
  if (!itemType || !itemId) {
    return NextResponse.json({ error: 'itemType and itemId query params are required.' }, { status: 400 });
  }

  const removed = removeLibraryItem(auth.actor.id, itemType, itemId);
  return NextResponse.json({ removed });
}
