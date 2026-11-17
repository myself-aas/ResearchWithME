import { NextResponse } from 'next/server';
import { enforceRateLimit, requireContributor } from '@/lib/v34/http';
import { restoreDraftFromSnapshot } from '@/lib/v34/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; snapshotId: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-draft-restore-param', 15, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id, snapshotId } = await context.params;
  const res = restoreDraftFromSnapshot({
    draftId: id,
    snapshotId,
    authorId: auth.actor.id,
  });
  if (!res.ok) {
    return NextResponse.json({ error: res.message }, { status: res.status });
  }
  return NextResponse.json({ draft: res.draft, restoredFromSnapshotId: snapshotId });
}
