import { NextResponse } from 'next/server';
import { getDashboardUser } from '@/lib/cms/auth';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { runWithIdempotency } from '@/lib/v34/idempotency';
import {
  RecordRecognitionEventInputSchema,
  ReverseRecognitionEventInputSchema,
} from '@/lib/v34/wave3-contracts';
import {
  getRecognitionSummary,
  recordRecognitionEvent,
  reverseRecognitionEvent,
} from '@/lib/v34/wave3-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const paramHandle = new URL(request.url).searchParams.get('handle')?.trim();
  if (paramHandle) {
    return NextResponse.json(getRecognitionSummary(paramHandle));
  }
  const user = await getDashboardUser();
  const actorHandle = user?.email?.split('@')[0]?.trim();
  if (!actorHandle) {
    return NextResponse.json(
      { error: 'Specify ?handle=<username> or sign in to view your recognition summary.' },
      { status: 400 },
    );
  }
  return NextResponse.json(getRecognitionSummary(actorHandle));
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-recognition-write', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, RecordRecognitionEventInputSchema);
  if (!parsed.ok) return parsed.response;

  return runWithIdempotency(
    request,
    { scope: 'v34-recognition-record', actorId: auth.actor.id, payloadHashInput: parsed.data },
    async () => {
      const result = await recordRecognitionEvent({
        ...parsed.data,
        actorId: auth.actor.id,
        actorHandle: auth.actor.handle,
        supabase: auth.actor.supabase,
      });

      if (!result.ok) {
        return NextResponse.json(
          { error: result.message, code: result.code },
          { status: result.status },
        );
      }
      return NextResponse.json(
        { event: result.event, summary: result.summary },
        { status: 201 },
      );
    },
  );
}

export async function PATCH(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-recognition-reverse', 15, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;
  if (!auth.actor.isEditor) {
    return NextResponse.json(
      { error: 'Editor access is required to reverse a recognition event.' },
      { status: 403 },
    );
  }

  const parsed = await parseJsonBody(request, ReverseRecognitionEventInputSchema);
  if (!parsed.ok) return parsed.response;

  const event = await reverseRecognitionEvent({
    eventId: parsed.data.eventId,
    reason: parsed.data.reason,
    supabase: auth.actor.supabase,
  });
  if (!event) {
    return NextResponse.json({ error: 'Recognition event not found.' }, { status: 404 });
  }
  return NextResponse.json({
    event,
    summary: getRecognitionSummary(event.recipientHandle).summary,
  });
}
