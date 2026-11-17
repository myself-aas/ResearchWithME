import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { parsePaginationParams } from '@/lib/v34/pagination';
import { listAttentionPage } from '@/lib/v34/sql-list-readers';
import { UpdateAttentionItemInputSchema } from '@/lib/v34/wave3-contracts';
import { updateAttentionItemStatus } from '@/lib/v34/wave3-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-attention-read', 120, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const page = await listAttentionPage(
    parsePaginationParams(request.url),
    auth.actor.id,
    auth.actor.supabase,
  );
  return NextResponse.json({
    items: page.items,
    openCount: page.openCount,
    cursor: page.cursor,
    limit: page.limit,
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
    total: page.total,
  });
}

export async function PATCH(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-attention-patch', 40, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, UpdateAttentionItemInputSchema);
  if (!parsed.ok) return parsed.response;

  const item = await updateAttentionItemStatus({
    userId: auth.actor.id,
    id: parsed.data.id,
    status: parsed.data.status,
    supabase: auth.actor.supabase,
  });
  if (!item) {
    return NextResponse.json({ error: 'Attention item not found.' }, { status: 404 });
  }
  return NextResponse.json({ item });
}
