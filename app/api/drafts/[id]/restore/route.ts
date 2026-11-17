import { NextResponse } from 'next/server';
import {
  enforceRateLimit,
  handleV34Error,
  parseJsonBody,
  requireAuthorized,
  requireContributor,
} from '@/lib/v34/http';
import { getDraft, persistDraftToSupabase, restoreDraftFromSnapshot } from '@/lib/v34/store';
import { RestoreDraftInputSchema } from '@/lib/v34/wave6-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-draft-restore', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, RestoreDraftInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const existing = getDraft(id, auth.actor.id);
  const authz = requireAuthorized(auth.actor, 'draft:write', {
    kind: 'draft',
    id,
    ownerId: existing?.authorId ?? auth.actor.id,
    classification: 'WORKSPACE',
  });
  if (!authz.ok) return authz.response;

  try {
    const result = restoreDraftFromSnapshot({
      draftId: id,
      snapshotId: parsed.data.snapshotId,
      authorId: auth.actor.id,
      expectedServerVersion: parsed.data.expectedServerVersion,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: result.status });
    }
    await persistDraftToSupabase(auth.actor.supabase, result.draft);
    return NextResponse.json({
      draft: result.draft,
      restoredFromSnapshotId: result.restoredFrom.id,
      restoredFromVersion: result.restoredFrom.version,
    });
  } catch (err) {
    return handleV34Error(err);
  }
}
