import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { parsePaginationParams } from '@/lib/v34/pagination';
import { listNotificationsPage } from '@/lib/v34/sql-list-readers';
import { UpdateNotificationInputSchema } from '@/lib/v34/wave3-contracts';
import { setNotificationRead } from '@/lib/v34/wave3-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-notifications-read', 120, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const page = await listNotificationsPage(
    parsePaginationParams(request.url),
    auth.actor.id,
    auth.actor.supabase,
  );
  return NextResponse.json({
    notifications: page.items,
    unreadCount: page.unreadCount,
    cursor: page.cursor,
    limit: page.limit,
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
    total: page.total,
  });
}

export async function PATCH(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-notifications-patch', 40, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, UpdateNotificationInputSchema);
  if (!parsed.ok) return parsed.response;

  const notification = await setNotificationRead({
    userId: auth.actor.id,
    id: parsed.data.id,
    read: parsed.data.read,
    supabase: auth.actor.supabase,
  });
  if (!notification) {
    return NextResponse.json({ error: 'Notification not found.' }, { status: 404 });
  }
  return NextResponse.json({ notification });
}
