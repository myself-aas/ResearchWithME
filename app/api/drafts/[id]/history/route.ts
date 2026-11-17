import { NextResponse } from 'next/server';
import { enforceRateLimit, requireAuthorized, requireContributor } from '@/lib/v34/http';
import { getDraft, getDraftHistory } from '@/lib/v34/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-drafts-history', 90, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const draft = getDraft(id, auth.actor.id);
  if (draft) {
    const authz = requireAuthorized(auth.actor, 'draft:read', {
      kind: 'draft',
      id,
      ownerId: draft.authorId,
      classification: 'CONFIDENTIAL',
    });
    if (!authz.ok) return authz.response;
  }

  const history = getDraftHistory(id, auth.actor.id);
  if (!history) {
    return NextResponse.json({ error: 'Draft not found.' }, { status: 404 });
  }

  return NextResponse.json({ draftId: id, snapshots: history });
}
