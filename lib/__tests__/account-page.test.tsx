import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AccountPage, { metadata } from '@/app/dashboard/account/page';
import { subscriptionStatusLabel } from '@/lib/billing/status';

const getEntitlement = vi.fn();

vi.mock('@/components/BlogHeader', () => ({ default: () => null }));
vi.mock('@/components/BlogFooter', () => ({ default: () => null }));
vi.mock('@/components/billing/LemonSqueezyScript', () => ({ default: () => null }));
vi.mock('@/components/billing/CheckoutButton', () => ({
  default: ({ product }: { product: string }) => <button type="button">{`buy-${product}`}</button>,
}));
vi.mock('@/lib/cms/auth', () => ({
  getDashboardUser: async () => ({ id: 'user-1', email: 'r@example.org', name: 'Reader', isEditor: false }),
}));
vi.mock('@/lib/billing/store', async () => {
  const actual = await vi.importActual<typeof import('@/lib/billing/store')>('@/lib/billing/store');
  return { ...actual, getBillingStore: async () => ({ getEntitlement }) };
});

async function render() {
  return renderToStaticMarkup(createElement(MemoryRouter, null, await AccountPage()));
}

beforeEach(() => {
  getEntitlement.mockReset();
  vi.unstubAllEnvs();
  vi.stubEnv('LEMONSQUEEZY_API_KEY', 'test-key');
  vi.stubEnv('LEMONSQUEEZY_STORE_ID', '1');
  vi.stubEnv('LEMONSQUEEZY_VARIANT_TEARDOWN', '2');
});

describe('/dashboard/account', () => {
  it('offers nothing to buy while the store has no product', async () => {
    vi.stubEnv('LEMONSQUEEZY_VARIANT_TEARDOWN', '');
    getEntitlement.mockResolvedValue({ plan: 'none', status: 'none', aiCredits: 0, currentPeriodEnd: null });
    const html = await render();
    expect(html).toContain('Nothing is on sale yet');
    expect(html).not.toContain('buy-teardown');
  });

  it('tells an account with no purchases what to do next', async () => {
    getEntitlement.mockResolvedValue({ plan: 'none', status: 'none', aiCredits: 0, currentPeriodEnd: null });
    const html = await render();
    expect(html).toContain('No purchases yet');
    expect(html).toContain('href="/pricing"');
  });

  it('shows an active subscription plainly', async () => {
    getEntitlement.mockResolvedValue({ plan: 'copilot', status: 'active', aiCredits: 120, currentPeriodEnd: '2026-12-13T00:00:00.000Z' });
    const html = await render();
    expect(html).toContain('Active');
    expect(html).toContain('120');
    // An active subscriber must never be sold the thing they already pay for.
    expect(html).not.toContain('buy-copilot');
  });

  it('shows an ended subscription without the word Active', async () => {
    getEntitlement.mockResolvedValue({ plan: 'copilot', status: 'expired', aiCredits: 0, currentPeriodEnd: '2026-11-01T00:00:00.000Z' });
    const html = await render();
    expect(html).not.toContain('Active');
    expect(html.toLowerCase()).toContain('ended');
    expect(html).toContain('href="/pricing"');
  });

  it('keeps access while a payment is past due, and says why (D2)', async () => {
    getEntitlement.mockResolvedValue({ plan: 'copilot', status: 'past_due', aiCredits: 40, currentPeriodEnd: '2026-12-13T00:00:00.000Z' });
    const html = await render();
    // The state word comes from the shared label; the reassurance is the page's.
    expect(html).toContain(subscriptionStatusLabel('past_due'));
    expect(html.toLowerCase()).toContain('still on');
  });

  it('shows a one-time purchase as bought, not as a lapsed plan', async () => {
    getEntitlement.mockResolvedValue({ plan: 'purchases', status: 'none', aiCredits: 0, currentPeriodEnd: null });
    const html = await render();
    expect(html).toContain('Purchased');
    expect(html).not.toContain('No purchases yet');
    // It must not claim a subscription that was never bought. Scope this to the
    // fact list, which is where a plan would be named.
    const facts = html.slice(0, html.indexOf('Purchases'));
    expect(facts).not.toContain('Research Co-Pilot');
  });

  it('uses the shared status wording rather than a second copy of it', async () => {
    // lib/billing/status.ts owns this vocabulary; a page-local table drifted
    // from it (the page said "Ended" where the shared label says the same thing
    // differently, and neither was the other's source of truth).
    for (const status of ['on_trial', 'active', 'paused', 'past_due', 'cancelled', 'unpaid', 'expired'] as const) {
      getEntitlement.mockResolvedValue({
        plan: 'copilot',
        status,
        aiCredits: 0,
        currentPeriodEnd: '2026-12-13T00:00:00.000Z',
      });
      const html = await render();
      expect(html).toContain(subscriptionStatusLabel(status));
    }
  });

  it('stays out of search results', () => {
    expect(metadata.robots).toEqual({ index: false, follow: false, nocache: true });
  });

  it('does not invent a billing portal link', async () => {
    getEntitlement.mockResolvedValue({ plan: 'copilot', status: 'active', aiCredits: 10, currentPeriodEnd: '2026-12-13T00:00:00.000Z' });
    const html = await render();
    expect(html).not.toContain('Manage billing');
  });
});
