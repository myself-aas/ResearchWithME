import { NextResponse } from 'next/server';
import { enforceRateLimit, requireContributor } from '@/lib/v34/http';
import { listAttentionItems } from '@/lib/v34/wave3-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-dash-attention', 60, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const status = url.searchParams.get('status') ?? undefined;
  const items = listAttentionItems(auth.actor.id).filter((i) => (!status ? true : i.status === status));
  return NextResponse.json({ items, total: items.length, nextCursor: null });
}
