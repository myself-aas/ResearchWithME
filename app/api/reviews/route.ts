import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { runWithIdempotency } from '@/lib/v34/idempotency';
import { parsePaginationParams } from '@/lib/v34/pagination';
import { listReviewsPage } from '@/lib/v34/sql-list-readers';
import { CreateReviewInputSchema } from '@/lib/v34/wave2-contracts';
import { createFormalReview } from '@/lib/v34/wave2-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-reviews-read', 120, 60_000);
  if (limited) return limited;

  const url = new URL(request.url);
  const contributionId = url.searchParams.get('contributionId') ?? undefined;
  const page = await listReviewsPage(parsePaginationParams(url), contributionId);
  return NextResponse.json({
    reviews: page.items,
    cursor: page.cursor,
    limit: page.limit,
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
    total: page.total,
  });
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-reviews-write', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, CreateReviewInputSchema);
  if (!parsed.ok) return parsed.response;

  return runWithIdempotency(
    request,
    {
      scope: 'v34-reviews-create',
      actorId: auth.actor.id,
      payloadHashInput: parsed.data,
      supabase: auth.actor.supabase,
    },
    async () => {
      const result = await createFormalReview({
        ...parsed.data,
        actorId: auth.actor.id,
        actorHandle: auth.actor.handle,
        actorName: auth.actor.name,
        supabase: auth.actor.supabase,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.message }, { status: result.status });
      }
      return NextResponse.json({ review: result.review }, { status: 201 });
    },
  );
}
