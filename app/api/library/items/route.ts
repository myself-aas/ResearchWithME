import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { runWithIdempotency } from '@/lib/v34/idempotency';
import { persistLibraryItemToSupabase, upsertLibraryItem } from '@/lib/v34/store';
import { CreateLibraryItemDirectInputSchema } from '@/lib/v34/wave8-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function mapObjectType(
  t: 'SOURCE' | 'CONTRIBUTION' | 'TOOL' | 'CLAIM' | 'PROJECT',
): 'source' | 'contribution' | 'claim' | 'tool' {
  if (t === 'SOURCE') return 'source';
  if (t === 'CLAIM') return 'claim';
  if (t === 'TOOL') return 'tool';
  return 'contribution';
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-library-items-create', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, CreateLibraryItemDirectInputSchema);
  if (!parsed.ok) return parsed.response;

  return runWithIdempotency(
    request,
    { scope: 'v34-library-items-create', actorId: auth.actor.id, payloadHashInput: parsed.data },
    async () => {
      const itemType = mapObjectType(parsed.data.targetType);
      const item = upsertLibraryItem(auth.actor.id, {
        itemType,
        itemId: parsed.data.targetId,
        title: parsed.data.title ?? `${parsed.data.targetType}:${parsed.data.targetId}`,
        url: itemType === 'source' ? `/source/${parsed.data.targetId}` : `/contribution/${parsed.data.targetId}`,
        collection: parsed.data.collectionId ?? 'Default Library',
        note: parsed.data.note,
      });
      await persistLibraryItemToSupabase(auth.actor.supabase, item);
      return NextResponse.json({ item }, { status: 201 });
    },
  );
}
