import { NextResponse } from 'next/server';
import { enforceRateLimit, requireContributor } from '@/lib/v34/http';
import { getDashboardActivity } from '@/lib/v34/wave8-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-dash-activity', 60, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const data = getDashboardActivity(auth.actor.id);
  return NextResponse.json({ ...data, total: data.items.length, nextCursor: null });
}
