import { NextResponse } from 'next/server';
import { getDashboardUser } from '@/lib/cms/auth';
import { UpdateContributionInputSchema } from '@/lib/v34/contracts';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { getContributionById, updateContribution } from '@/lib/v34/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const contribution = getContributionById(id);
  if (!contribution) {
    return NextResponse.json({ error: 'Contribution not found.' }, { status: 404 });
  }

  if (contribution.lifecycle !== 'published') {
    const user = await getDashboardUser();
    if (user && contribution.authorId && contribution.authorId !== user.id && !user.isEditor) {
      return NextResponse.json({ error: 'Contribution not found.' }, { status: 404 });
    }
  }

  return NextResponse.json({ contribution });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-contributions-patch', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const existing = getContributionById(id);
  if (!existing) {
    return NextResponse.json({ error: 'Contribution not found.' }, { status: 404 });
  }
  if (existing.authorId && existing.authorId !== auth.actor.id && !auth.actor.isEditor) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const parsed = await parseJsonBody(request, UpdateContributionInputSchema);
  if (!parsed.ok) return parsed.response;

  const result = updateContribution(existing.id, parsed.data);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.message, current: result.current },
      { status: result.status },
    );
  }

  return NextResponse.json({ contribution: result.contribution });
}
