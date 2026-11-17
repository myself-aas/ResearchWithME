import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { UpdateAffiliationInputSchema } from '@/lib/v34/wave8-contracts';
import { deleteUserAffiliation, updateUserAffiliation } from '@/lib/v34/wave8-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-me-aff-patch', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, UpdateAffiliationInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const affiliation = await updateUserAffiliation({
    userId: auth.actor.id,
    affiliationId: id,
    ...parsed.data,
  });
  if (!affiliation) {
    return NextResponse.json({ error: 'Affiliation not found.' }, { status: 404 });
  }
  return NextResponse.json({ affiliation });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-me-aff-delete', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const ok = await deleteUserAffiliation({ userId: auth.actor.id, affiliationId: id });
  if (!ok) {
    return NextResponse.json({ error: 'Affiliation not found.' }, { status: 404 });
  }
  return NextResponse.json({ deleted: true, id });
}
