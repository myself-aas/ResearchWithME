import { NextResponse } from 'next/server';
import { evaluateContributionPublishBlockers } from '@/lib/v34/ai-governance';
import { PublishContributionInputSchema, type AIProvenance } from '@/lib/v34/contracts';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { runWithIdempotency } from '@/lib/v34/idempotency';
import { getContributionById, persistContributionToSupabase, publishContribution } from '@/lib/v34/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-contributions-publish', 15, 60_000);
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

  let body: { retractionAddressed?: boolean; aiProvenance?: AIProvenance | null } = {};
  const text = await request.text();
  if (text.trim()) {
    const parsed = await parseJsonBody(
      new Request(request.url, { method: 'POST', body: text, headers: request.headers }),
      PublishContributionInputSchema,
    );
    if (!parsed.ok) return parsed.response;
    body = parsed.data;
  }

  return runWithIdempotency(
    request,
    { scope: `v34-contributions-publish:${existing.id}`, actorId: auth.actor.id, payloadHashInput: body },
    async () => {
      const govBlockers = await evaluateContributionPublishBlockers(existing);
      const activeGovBlockers = govBlockers.filter(
        (b) => !(b.code === 'UNREVIEWED_RETRACTION_IMPACT' && body.retractionAddressed),
      );
      const nonRetractionBlockers = activeGovBlockers.filter(
        (b) => b.code !== 'UNREVIEWED_RETRACTION_IMPACT',
      );
      if (nonRetractionBlockers.length > 0) {
        return NextResponse.json(
          {
            error: nonRetractionBlockers[0].message,
            code: nonRetractionBlockers[0].code,
            blockers: nonRetractionBlockers.map((b) => b.message),
            detailedBlockers: nonRetractionBlockers,
          },
          { status: 422 },
        );
      }

      const result = publishContribution(existing.id, {
        retractionAddressed: body.retractionAddressed,
        aiProvenance: body.aiProvenance,
      });

      if (!result.ok) {
        return NextResponse.json(
          { error: result.message, blockers: result.blockers ?? [] },
          { status: result.status },
        );
      }

      await persistContributionToSupabase(auth.actor.supabase, result.contribution);
      return NextResponse.json({ contribution: result.contribution });
    },
  );
}
