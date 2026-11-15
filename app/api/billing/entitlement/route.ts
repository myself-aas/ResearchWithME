import { NextResponse } from 'next/server';
import { getDashboardUser } from '@/lib/cms/auth';
import { noStoreHeaders } from '@/lib/cms/http';
import { getBillingStore, isBillingConfigured } from '@/lib/billing/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * What the signed-in account owns, read through the session client so the
 * `auth.uid() = user_id` policies decide the rows.
 *
 * `getDashboardUser()` already returns null in demo mode, which is the right
 * answer here: an endpoint that reports someone's purchases has no meaningful
 * local equivalent. Never cached — a purchase should be visible on the next
 * request, not after a 30 s window.
 */
export async function GET() {
  const user = await getDashboardUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Sign in to see your plan and purchases.' },
      { status: 401, headers: noStoreHeaders() },
    );
  }

  if (!isBillingConfigured()) {
    return NextResponse.json(
      { error: 'Billing is not configured on this deployment.' },
      { status: 503, headers: noStoreHeaders() },
    );
  }

  try {
    const store = await getBillingStore();
    const entitlement = await store.getEntitlement(user.id);
    return NextResponse.json({ entitlement }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error('Could not read the billing entitlement:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Your plan could not be read right now. Try again in a moment.' },
      { status: 500, headers: noStoreHeaders() },
    );
  }
}
