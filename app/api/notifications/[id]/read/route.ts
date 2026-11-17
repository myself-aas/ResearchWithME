import { NextResponse } from 'next/server';
import { enforceRateLimit, requireContributor } from '@/lib/v34/http';
import { setNotificationRead } from '@/lib/v34/wave3-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-notification-read', 60, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const updated = await setNotificationRead({
    userId: auth.actor.id,
    id,
    read: true,
    supabase: auth.actor.supabase,
  });
  if (!updated) {
    return NextResponse.json({ error: 'Notification not found.' }, { status: 404 });
  }
  return NextResponse.json({ notification: updated });
}
