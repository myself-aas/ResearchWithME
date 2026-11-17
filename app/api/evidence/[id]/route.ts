import { NextResponse } from 'next/server';
import { UpdateEvidenceInputSchema } from '@/lib/v34/contracts';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { deleteEvidence, getEvidenceById, updateEvidence } from '@/lib/v34/store';
import { listEvidenceAssessments } from '@/lib/v34/wave8-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const evidence = getEvidenceById(id);
  if (!evidence) {
    return NextResponse.json({ error: 'Evidence record not found.' }, { status: 404 });
  }
  return NextResponse.json({ evidence, assessments: listEvidenceAssessments(id) });
}

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

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-evidence-delete', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const res = deleteEvidence(id);
  if (!res.ok) {
    return NextResponse.json({ error: res.message }, { status: res.status });
  }
  return NextResponse.json({ deleted: true, id: res.deletedId });
}
