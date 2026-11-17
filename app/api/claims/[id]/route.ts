import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { deleteClaim, getClaimById, updateClaim } from '@/lib/v34/store';
import { UpdateClaimInputSchema } from '@/lib/v34/wave5-contracts';
import { listClaimAssessments } from '@/lib/v34/wave8-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const detail = getClaimById(id);
  if (!detail) {
    return NextResponse.json({ error: 'Claim not found.' }, { status: 404 });
  }
  return NextResponse.json({ ...detail, assessments: listClaimAssessments(id) });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-claim-update', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, UpdateClaimInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const claim = updateClaim(id, parsed.data);
  if (!claim) {
    return NextResponse.json({ error: 'Claim not found.' }, { status: 404 });
  }
  return NextResponse.json({ claim });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-claim-delete', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const res = deleteClaim(id);
  if (!res.ok) {
    return NextResponse.json({ error: res.message }, { status: res.status });
  }
  return NextResponse.json({ deleted: true, id: res.deletedId });
}
