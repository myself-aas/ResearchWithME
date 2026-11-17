import { NextResponse } from 'next/server';
import { billingEventIgnoredReason, normaliseBillingEvent } from '@/lib/billing/events';
import { verifyLemonSignature } from '@/lib/billing/signature';
import { getBillingStore, isBillingConfigured } from '@/lib/billing/store';
import { enforceRateLimit } from '@/lib/v34/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Lemon Squeezy billing webhook.
 *
 * The order of the checks below is the whole design:
 *
 *   1. Unconfigured deployment → 503. A 500 here would look like our bug and
 *      make Lemon Squeezy retry a request that can never succeed.
 *   2. Oversized body → 413, *before* hashing. The signature covers the raw
 *      body, so the body has to exist before it can be verified — but nothing
 *      says a stranger may make the Worker hash megabytes of their input.
 *   3. Bad signature → 401. The HMAC is over the raw text; the JSON is only
 *      parsed after it matches, because re-serialising changes the bytes.
 *   4. Unreadable JSON → 400. A 500 would be retried; a malformed body is the
 *      sender's problem and will stay malformed.
 *   5. Unhandled event → 200. Lemon Squeezy retries a non-2xx up to three
 *      times, and a `license_key_created` event is not an error.
 *   6. Anything else → 200 once the store applied it, or 500 when the store
 *      could not reach Postgres, which *is* worth a retry because the event id
 *      makes a duplicate delivery harmless.
 *
 * Deliberately absent: an origin check (server-to-server requests carry no
 * Origin) and a rate limit (every hit would spend one of the shared 1,000 KV
 * writes a day; the HMAC and the 1 MB cap already bound the work).
 */

/** One megabyte: far above any real Lemon Squeezy payload, far below a nuisance. */
const MAX_BODY_BYTES = 1_048_576;

export async function POST(request: Request) {
  const env = process.env;
  if (!isBillingConfigured(env)) {
    return NextResponse.json(
      {
        error:
          'Billing is not configured on this deployment. Set LEMONSQUEEZY_WEBHOOK_SECRET, BILLING_BRIDGE_SECRET, and the Supabase credentials.',
      },
      { status: 503 },
    );
  }

  const limited = await enforceRateLimit(request, 'webhook-lemonsqueezy', 120, 60_000);
  if (limited) return limited;

  const declared = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'The payload is too large.' }, { status: 413 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'The payload is too large.' }, { status: 413 });
  }

  const secret = (env.LEMONSQUEEZY_WEBHOOK_SECRET ?? '').trim();
  if (!verifyLemonSignature(raw, request.headers.get('x-signature'), secret)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'The payload could not be read.' }, { status: 400 });
  }

  const event = normaliseBillingEvent(body);

  try {
    const store = await getBillingStore();
    const outcome = await store.applyEvent(event);

    if (outcome === 'ignored') {
      // 200, so Lemon Squeezy stops retrying — but the reason is the only trail
      // an owner has for "a purchase happened and nothing was written". The
      // `missing_user_id` case is the one that matters: a checkout link made
      // outside the app, or a legacy link, lands here.
      console.warn(
        `Lemon Squeezy webhook ${event.eventId} (${event.eventName}) was ignored: ${
          billingEventIgnoredReason(event) ?? 'unknown'
        }`,
      );
    }

    return NextResponse.json({ received: true, outcome });
  } catch (error) {
    console.error(
      `Lemon Squeezy webhook ${event.eventId} (${event.eventName}) could not be applied:`,
      error instanceof Error ? error.message : error,
    );
    // The event id makes the retry Lemon Squeezy will now make idempotent.
    return NextResponse.json({ error: 'The event could not be recorded. Retry.' }, { status: 500 });
  }
}
