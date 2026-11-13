import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import PricingPage from '@/app/pricing/page';
import sitemap from '@/app/sitemap';

vi.mock('@/components/BlogHeader', () => ({ default: () => null }));
vi.mock('@/components/BlogFooter', () => ({ default: () => null }));
const getDashboardUser = vi.fn(async (): Promise<unknown> => null);
vi.mock('@/lib/cms/auth', () => ({ getDashboardUser: () => getDashboardUser() }));
vi.mock('@/components/billing/CheckoutButton', () => ({
  default: ({ label }: { label: string }) => <button type="button">{label}</button>,
}));
vi.mock('@/components/billing/LemonSqueezyScript', () => ({ default: () => null }));

// next/link is aliased to the React Router shim in vitest.config.ts, so the tree
// needs a router — same as the other page tests in this directory.
async function render() {
  return renderToStaticMarkup(
    createElement(MemoryRouter, null, await PricingPage()),
  );
}

describe('/pricing', () => {
  it('shows all three products with the spec prices', async () => {
    const html = await render();

    expect(html).toContain('The Teardown System');
    expect(html).toContain('Research Co-Pilot');
    expect(html).toContain('Manuscript Editing');
    expect(html).toContain('$19');
    expect(html).toContain('$9 / month');
    expect(html).toContain('$150');
  });

  it('says plainly that reading stays free, and links to the mission', async () => {
    const html = await render();
    expect(html).toContain('href="/about"');
    expect(html.toLowerCase()).toContain('free');
  });

  it('makes no promise this implementation cannot keep', async () => {
    const html = (await render()).toLowerCase();
    expect(html).not.toContain('paywall');
    expect(html).not.toContain('free trial');
    expect(html).not.toContain('cancel anytime');
  });

  it('asks a signed-out reader to sign in rather than failing at checkout', async () => {
    getDashboardUser.mockResolvedValueOnce(null);
    const html = await render();
    expect(html).toContain('href="/login?next=/pricing"');
    expect(html).toContain('Sign in to buy');
  });

  it('gives a signed-in reader a checkout button per product', async () => {
    getDashboardUser.mockResolvedValueOnce({ id: 'user-1', email: 'r@example.org', name: 'R', isEditor: false });
    const html = await render();
    expect(html).not.toContain('Sign in to buy');
    expect(html.match(/<button/g)?.length ?? 0).toBe(3);
  });

  it('is in the sitemap with a stable priority', async () => {
    const entries = await sitemap();
    const pricing = entries.find((entry) => new URL(entry.url).pathname === '/pricing');
    expect(pricing).toBeDefined();
    expect(pricing?.priority).toBe(0.6);
    expect(pricing?.changeFrequency).toBe('monthly');
  });
});
