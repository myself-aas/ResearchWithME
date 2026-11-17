import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { getSourceWithDetails, updateSource } from '@/lib/v34/store';
import { UpdateSourceInputSchema } from '@/lib/v34/wave8-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const details = await getSourceWithDetails(id);
  if (!details) {
    return NextResponse.json({ error: 'Source not found.' }, { status: 404 });
  }
  return NextResponse.json(details);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-source-patch', 25, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, UpdateSourceInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const integrityMap: Record<string, 'active' | 'corrected' | 'expression-of-concern' | 'retracted' | 'withdrawn'> = {
    VERIFIED: 'active',
    UNVERIFIED: 'active',
    CORRECTED: 'corrected',
    EXPRESSION_OF_CONCERN: 'expression-of-concern',
    RETRACTED: 'retracted',
  };
  const updated = updateSource(id, {
    title: parsed.data.title,
    venue: parsed.data.venue,
    publishedDate: parsed.data.year ? `${parsed.data.year}-01-01` : undefined,
    canonicalUrl: parsed.data.canonicalUrl,
    integrityStatus: parsed.data.integrityStatus ? integrityMap[parsed.data.integrityStatus] : undefined,
  });
  if (!updated) {
    return NextResponse.json({ error: 'Source not found.' }, { status: 404 });
  }
  return NextResponse.json({ source: updated });
}
