import { NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/v34/http';
import { getDiscussionById } from '@/lib/v34/wave3-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-discussions-get', 120, 60_000);
  if (limited) return limited;

  const { id } = await context.params;
  const discussion = getDiscussionById(id);
  if (!discussion) {
    return NextResponse.json({ error: 'Discussion thread not found.' }, { status: 404 });
  }
  return NextResponse.json({ discussion });
}
