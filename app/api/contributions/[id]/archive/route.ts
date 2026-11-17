import { NextResponse } from 'next/server';
import { enforceRateLimit, requireContributor } from '@/lib/v34/http';
import {
  archiveContribution,
  getContributionById,
  persistContributionToSupabase,
} from '@/lib/v34/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-contrib-archive', 15, 60_000);
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

  const result = archiveContribution(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
  await persistContributionToSupabase(auth.actor.supabase, result.contribution);
  return NextResponse.json({
    contribution: result.contribution,
    canonicalObjectsPreserved: true,
  });
}
