import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { UpdateNotificationInputSchema } from '@/lib/v34/wave3-contracts';
import { listNotifications, setNotificationRead } from '@/lib/v34/wave3-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const notifications = listNotifications(auth.actor.id);
  const unreadCount = notifications.filter((n) => n.readAt === null).length;
  return NextResponse.json({ notifications, unreadCount, total: notifications.length });
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
