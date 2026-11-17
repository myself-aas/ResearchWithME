import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { deleteRelationshipById, updateRelationshipById } from '@/lib/v34/store';
import { UpdateRelationshipInputSchema } from '@/lib/v34/wave7-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-relationship-update', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, UpdateRelationshipInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const result = updateRelationshipById(id, parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
  return NextResponse.json({ relationship: result.relationship });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-relationship-delete', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const result = deleteRelationshipById(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
  return NextResponse.json({ deleted: true, id: result.deletedId });
}
