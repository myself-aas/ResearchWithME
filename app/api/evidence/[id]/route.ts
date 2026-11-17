import { NextResponse } from 'next/server';
import { UpdateEvidenceInputSchema } from '@/lib/v34/contracts';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { updateEvidence } from '@/lib/v34/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-evidence-patch', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, UpdateEvidenceInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const updated = updateEvidence(id, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: 'Evidence record not found.' }, { status: 404 });
  }

  return NextResponse.json({ evidence: updated });
}
