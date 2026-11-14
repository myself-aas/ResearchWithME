import { NextResponse } from 'next/server';
import { getDashboardUser } from '@/lib/cms/auth';
import { isSameOrigin, noStoreHeaders, readJsonBody } from '@/lib/cms/http';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { isBillingProductKey } from '@/lib/billing/catalogue';
import {
  CheckoutNotConfiguredError,
  CheckoutUnavailableError,
  createCheckout,
} from '@/lib/billing/checkout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Start a checkout for a signed-in reader.
 *
 * The client sends a product key, never a variant id and never a price: the
 * variant is resolved here from the deployment's environment (Task 8's
 * `lib/billing/checkout.ts`), so a modified request can only ask for a product
 * this site sells.
 *
 * Failure codes are chosen so the person reading the screen knows who can fix
 * it: 503 means this deployment is missing configuration, 502 means Lemon
 * Squeezy said no, 429 means slow down.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-site requests are not allowed.' }, { status: 403 });
  }

  const user = await getDashboardUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in before buying.' }, { status: 401 });
  }

  const limit = await rateLimit(clientKey(request, 'billing:checkout'), 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many checkout attempts. Wait a minute and try again.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const product = (body.value as { product?: unknown } | null)?.product;
  if (!isBillingProductKey(product)) {
    return NextResponse.json({ error: 'That is not a product this site sells.' }, { status: 400 });
  }

  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim() || 'https://researchwith.me';
  const redirectUrl = new URL('/dashboard/account', site).toString();

  try {
    const { url } = await createCheckout({
      userId: user.id,
      email: user.email,
      product,
      redirectUrl,
    });
    return NextResponse.json({ url }, { status: 201, headers: noStoreHeaders() });
  } catch (error) {
    if (error instanceof CheckoutNotConfiguredError) {
      console.error('Billing is configured incompletely:', error.message);
      return NextResponse.json(
        { error: 'Checkout is not available on this deployment yet.' },
        { status: 503, headers: noStoreHeaders() },
      );
    }
    if (error instanceof CheckoutUnavailableError) {
      console.error('Lemon Squeezy checkout failed:', error.message);
      return NextResponse.json(
        { error: 'The checkout service could not create a checkout. Try again in a moment.' },
        { status: 502, headers: noStoreHeaders() },
      );
    }
    console.error('Unexpected checkout failure:', error);
    return NextResponse.json(
      { error: 'The checkout could not be created. Try again in a moment.' },
      { status: 502, headers: noStoreHeaders() },
    );
  }
}
