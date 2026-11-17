import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { runWithIdempotency } from '@/lib/v34/idempotency';
import {
  listLibraryItems,
  persistLibraryItemToSupabase,
  upsertLibraryItem,
} from '@/lib/v34/store';
import { MigrateBookmarksInputSchema } from '@/lib/v34/wave6-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Part V §6.4 & Part VI §15 — Idempotent migration of legacy client bookmarks
 * into canonical Personal Research OS Library items.
 */
export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-library-migrate', 15, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, MigrateBookmarksInputSchema);
  if (!parsed.ok) return parsed.response;

  return runWithIdempotency(
    request,
    {
      scope: 'POST:/api/library/migrate-bookmarks',
      actorId: auth.actor.id,
      payloadHashInput: parsed.data,
      supabase: auth.actor.supabase,
    },
    async () => {
      const existingKeys = new Set(
        listLibraryItems(auth.actor.id).map((i) => `${i.itemType}:${i.itemId}`),
      );

      let migratedCount = 0;
      let skippedCount = 0;
      const items = [];

      for (const bm of parsed.data.bookmarks) {
        const key = `${bm.itemType}:${bm.id}`;
        if (existingKeys.has(key)) {
          skippedCount += 1;
          continue;
        }
        const normalizedType = bm.itemType === 'paper' ? 'source' : bm.itemType;
        const record = upsertLibraryItem(auth.actor.id, {
          itemType: normalizedType,
          itemId: bm.id,
          title: bm.title,
          url: bm.url,
          collection: bm.collection,
          note: bm.note,
        });
        await persistLibraryItemToSupabase(auth.actor.supabase, record);
        existingKeys.add(key);
        migratedCount += 1;
        items.push(record);
      }

      return NextResponse.json(
        {
          migratedCount,
          skippedCount,
          totalRequested: parsed.data.bookmarks.length,
          items,
        },
        { status: 201 },
      );
    },
  );
}
