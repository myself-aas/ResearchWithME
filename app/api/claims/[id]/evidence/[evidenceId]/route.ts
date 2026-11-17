import { NextResponse } from 'next/server';
import { enforceRateLimit, requireContributor } from '@/lib/v34/http';
import { removeClaimEvidenceLink } from '@/lib/v34/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; evidenceId: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-claim-ev-unlink', 25, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id, evidenceId } = await context.params;
  const removed = removeClaimEvidenceLink(id, evidenceId);
  if (!removed) {
    return NextResponse.json({ error: 'Claim-evidence link not found.' }, { status: 404 });
  }
  return NextResponse.json({ unlinked: true, claimId: id, evidenceId, canonicalPreserved: true });
}
