import { NextResponse } from 'next/server';
import { isV34FlagEnabled } from '@/lib/v34/feature-flags';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { runWithIdempotency } from '@/lib/v34/idempotency';
import {
  CreateSavedSearchInputSchema,
  UpdateSavedSearchInputSchema,
} from '@/lib/v34/wave5-contracts';
import {
  createSavedSearch,
  deleteSavedSearch,
  listSavedSearches,
  updateSavedSearch,
} from '@/lib/v34/wave5-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isV34FlagEnabled('v34-saved-searches')) {
    return NextResponse.json({ savedSearches: [], total: 0, flagDisabled: true });
  }
  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const savedSearches = listSavedSearches(auth.actor.id);
  return NextResponse.json({ savedSearches, total: savedSearches.length });
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-saved-search-write', 25, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, CreateSavedSearchInputSchema);
  if (!parsed.ok) return parsed.response;

  return runWithIdempotency(
    request,
    { scope: 'POST:/api/search/saved', actorId: auth.actor.id, payloadHashInput: parsed.data },
    async () => {
      const savedSearch = await createSavedSearch({
        userId: auth.actor.id,
        ...parsed.data,
        supabase: auth.actor.supabase,
      });
      return NextResponse.json({ savedSearch }, { status: 201 });
    },
  );
}

export async function PATCH(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-saved-search-patch', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, UpdateSavedSearchInputSchema);
  if (!parsed.ok) return parsed.response;

  const updated = await updateSavedSearch({
    userId: auth.actor.id,
    ...parsed.data,
    supabase: auth.actor.supabase,
  });
  if (!updated) {
    return NextResponse.json({ error: 'Saved search not found.' }, { status: 404 });
  }
  return NextResponse.json({ savedSearch: updated });
}

export async function DELETE(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-saved-search-delete', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const id = url.searchParams.get('id')?.trim();
  if (!id) {
    return NextResponse.json({ error: 'Query parameter id is required.' }, { status: 400 });
  }

  const removed = await deleteSavedSearch({
    userId: auth.actor.id,
    id,
    supabase: auth.actor.supabase,
  });
  if (!removed) {
    return NextResponse.json({ error: 'Saved search not found.' }, { status: 404 });
  }
  return NextResponse.json({ removed: true, id });
}
