import { NextResponse } from 'next/server';
import { requireContributor } from '@/lib/v34/http';
import { getDraftHistory } from '@/lib/v34/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const history = getDraftHistory(id, auth.actor.id);
  if (!history) {
    return NextResponse.json({ error: 'Draft not found.' }, { status: 404 });
  }

  return NextResponse.json({ draftId: id, snapshots: history });
}
