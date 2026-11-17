import { NextResponse } from 'next/server';
import { enforceRateLimit, requireAuthorized, requireContributor } from '@/lib/v34/http';
import { getDraft } from '@/lib/v34/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-drafts-get', 90, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const existing = getDraft(id, auth.actor.id);
  if (existing) {
    const authz = requireAuthorized(auth.actor, 'draft:read', {
      kind: 'draft',
      id,
      ownerId: existing.authorId,
      classification: 'CONFIDENTIAL',
    });
    if (!authz.ok) return authz.response;
  }

  const draft = getDraft(id, auth.actor.id);
  if (!draft) {
    return NextResponse.json({ error: 'Draft not found.' }, { status: 404 });
  }

  return NextResponse.json({ draft });
}
