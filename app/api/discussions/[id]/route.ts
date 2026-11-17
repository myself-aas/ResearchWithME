import { NextResponse } from 'next/server';
import { getDiscussionById } from '@/lib/v34/wave3-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const discussion = getDiscussionById(id);
  if (!discussion) {
    return NextResponse.json({ error: 'Discussion thread not found.' }, { status: 404 });
  }
  return NextResponse.json({ discussion });
}
