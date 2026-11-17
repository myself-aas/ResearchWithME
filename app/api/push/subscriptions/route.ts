import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import {
  listPushSubscriptions,
  registerPushSubscription,
  revokePushSubscription,
} from '@/lib/v34/wave7-store';
import { RegisterPushSubscriptionInputSchema } from '@/lib/v34/wave7-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const subscriptions = listPushSubscriptions(auth.actor.id).map((s) => ({
    id: s.id,
    deviceId: s.deviceId,
    endpoint: s.endpoint,
    classificationSafePreview: s.classificationSafePreview,
    createdAt: s.createdAt,
  }));
  return NextResponse.json({ subscriptions, total: subscriptions.length });
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-push-subscribe', 15, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, RegisterPushSubscriptionInputSchema);
  if (!parsed.ok) return parsed.response;

  const sub = await registerPushSubscription({
    userId: auth.actor.id,
    deviceId: parsed.data.deviceId ?? null,
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.p256dh,
    authSecret: parsed.data.authSecret,
    classificationSafePreview: parsed.data.classificationSafePreview,
    supabase: auth.actor.supabase,
  });

  return NextResponse.json(
    {
      subscription: {
        id: sub.id,
        deviceId: sub.deviceId,
        endpoint: sub.endpoint,
        classificationSafePreview: sub.classificationSafePreview,
        createdAt: sub.createdAt,
      },
    },
    { status: 201 },
  );
}

export async function DELETE(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-push-unsubscribe', 15, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const id = url.searchParams.get('id')?.trim();
  if (!id) {
    return NextResponse.json({ error: 'id query parameter is required.' }, { status: 400 });
  }
  const ok = await revokePushSubscription({
    userId: auth.actor.id,
    subscriptionId: id,
    supabase: auth.actor.supabase,
  });
  if (!ok) {
    return NextResponse.json({ error: 'Push subscription not found.' }, { status: 404 });
  }
  return NextResponse.json({ revoked: true, id });
}
