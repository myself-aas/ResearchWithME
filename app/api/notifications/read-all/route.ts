import { NextResponse } from 'next/server';
import { enforceRateLimit, requireContributor } from '@/lib/v34/http';
import { listAttentionItems, markAllNotificationsRead } from '@/lib/v34/wave3-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-notifications-read-all', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const result = await markAllNotificationsRead({
    userId: auth.actor.id,
    supabase: auth.actor.supabase,
  });

  // Explicitly report untouched open attention count (ADR-032-09)
  const openAttentionCount = listAttentionItems(auth.actor.id).filter(
    (a) => a.status === 'OPEN',
  ).length;

  return NextResponse.json({
    markedCount: result.markedCount,
    readAt: result.readAt,
    attentionItemsUnaffected: true,
    openAttentionCount,
  });
}
