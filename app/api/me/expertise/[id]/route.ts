import { NextResponse } from 'next/server';
import { enforceRateLimit, requireContributor } from '@/lib/v34/http';
import { deleteUserExpertise } from '@/lib/v34/wave8-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-me-exp-delete', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const ok = await deleteUserExpertise({ userId: auth.actor.id, expertiseId: id });
  if (!ok) {
    return NextResponse.json({ error: 'Expertise record not found.' }, { status: 404 });
  }
  return NextResponse.json({ deleted: true, id });
}
