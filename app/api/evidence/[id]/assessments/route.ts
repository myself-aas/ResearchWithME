import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { CreateEvidenceAssessmentInputSchema } from '@/lib/v34/wave8-contracts';
import { createEvidenceAssessment, listEvidenceAssessments } from '@/lib/v34/wave8-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const assessments = listEvidenceAssessments(id);
  return NextResponse.json({ assessments, total: assessments.length });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-evidence-assess', 25, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, CreateEvidenceAssessmentInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const assessment = await createEvidenceAssessment({
    evidenceId: id,
    assessorId: auth.actor.id,
    ...parsed.data,
    supabase: auth.actor.supabase,
  });
  if (!assessment) {
    return NextResponse.json({ error: 'Evidence record not found.' }, { status: 404 });
  }
  return NextResponse.json({ assessment }, { status: 201 });
}
