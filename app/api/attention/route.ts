import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { UpdateAttentionItemInputSchema } from '@/lib/v34/wave3-contracts';
import { listAttentionItems, updateAttentionItemStatus } from '@/lib/v34/wave3-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const items = listAttentionItems(auth.actor.id);
  const openCount = items.filter((i) => i.status === 'OPEN' || i.status === 'ACKNOWLEDGED').length;
  return NextResponse.json({ items, openCount, total: items.length });
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
