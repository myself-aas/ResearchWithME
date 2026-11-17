import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { runWithIdempotency } from '@/lib/v34/idempotency';
import {
  CreateDiscussionInputSchema,
  DISCUSSION_OBJECT_TYPES,
  type DiscussionObjectType,
} from '@/lib/v34/wave3-contracts';
import { createDiscussion, listDiscussions } from '@/lib/v34/wave3-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawType = url.searchParams.get('objectType') ?? undefined;
  const objectType =
    rawType && (DISCUSSION_OBJECT_TYPES as readonly string[]).includes(rawType)
      ? (rawType as DiscussionObjectType)
      : undefined;
  const objectId = url.searchParams.get('objectId') ?? undefined;

  const discussions = listDiscussions({ objectType, objectId });
  return NextResponse.json({ discussions, total: discussions.length });
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-discussions-write', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, CreateDiscussionInputSchema);
  if (!parsed.ok) return parsed.response;

  return runWithIdempotency(
    request,
    { scope: 'v34-discussions-create', actorId: auth.actor.id, payloadHashInput: parsed.data },
    async () => {
      const discussion = await createDiscussion({
        ...parsed.data,
        actorId: auth.actor.id,
        actorName: auth.actor.name,
        supabase: auth.actor.supabase,
      });

      return NextResponse.json({ discussion }, { status: 201 });
    },
  );
}
