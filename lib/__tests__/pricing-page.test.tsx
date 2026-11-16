import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PricingPage from '@/app/pricing/page';
import sitemap from '@/app/sitemap';
import { BILLING_PRODUCTS, FREE_DOWNLOADS } from '@/lib/billing/catalogue';
import { existsSync } from 'node:fs';
import path from 'node:path';

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
  // A deployment that can sell: key, store and the product's variant are set.
  beforeEach(() => {
    vi.stubEnv('LEMONSQUEEZY_API_KEY', 'test-key');
    vi.stubEnv('LEMONSQUEEZY_STORE_ID', '1');
    vi.stubEnv('LEMONSQUEEZY_VARIANT_TEARDOWN', '2');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('offers no way to buy while the store has no product for it', async () => {
    vi.stubEnv('LEMONSQUEEZY_VARIANT_TEARDOWN', '');
    for (const user of [null, { id: 'user-1', email: 'r@example.org', name: 'R', isEditor: false }]) {
      getDashboardUser.mockResolvedValueOnce(user);
      const html = await render();
      expect(html).toContain('Not on sale yet.');
      expect(html).not.toContain('Sign in to buy');
      expect(html).not.toContain('<button');
      expect(html).toContain('$19');
    }
  });

  it('offers the free downloads with no account, and each file exists', async () => {
    const html = await render();
    expect(FREE_DOWNLOADS.length).toBe(2);
    for (const item of FREE_DOWNLOADS) {
      expect(html).toContain(`href="${item.href}"`);
      expect(html).toContain(`id="download-${item.key}"`);
      expect(existsSync(path.join(process.cwd(), 'public', item.href)), item.href).toBe(true);
    }
    expect(html).toContain('need no account');
  });

  it('describes the free tools as software, never as a review or an edit, and prices nothing unsold', async () => {
    const copy = JSON.stringify(FREE_DOWNLOADS).toLowerCase();
    for (const word of ['review', 'proofread', 'rewrite', 'polish', 'humaniz', 'guarantee', 'acceptance', 'essay', 'homework', 'assignment', '$']) {
      expect(copy, word).not.toContain(word);
    }
  });

  it('shows the one product at the spec price, and no service or membership on sale', async () => {
    const html = await render();

    expect(html).toContain('The Teardown System');
    expect(html).not.toContain('product-copilot');
    expect(html).not.toContain('Manuscript Editing');
    expect(html).toContain('$19');
    expect(html).not.toContain('$9');
    expect(html).not.toContain('$150');
  });

  it('publishes each catalogue product with its own structured price', async () => {
    const html = await render();
    const json = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)?.[1];
    expect(json).toBeDefined();
    const offers = JSON.parse(json!).itemListElement as Array<{ name: string; price: string; priceCurrency: string }>;
    for (const product of BILLING_PRODUCTS) {
      const offer = offers.find((item) => item.name === product.name);
      expect(Number(offer?.price)).toBe(Number(product.priceLabel.slice(1)));
      expect(offer?.priceCurrency).toBe('USD');
    }
  });

  it('introduces both products without claiming there is only one', async () => {
    const html = await render();
    expect(html).not.toContain('One thing goes further.');
  });

  it('lists the table program at its price, and sells it only once its own variant is set', async () => {
    const off = await render();
    expect(off).toContain('Statistical Table Generator');
    expect(off).toContain('$5</p>');
    expect(off).toContain('Python 3.8');
    expect(off).not.toContain('all possible');
    getDashboardUser.mockResolvedValue({ id: 'user-1', email: 'r@example.org', name: 'R', isEditor: false });
    expect((await render()).match(/<button/g)?.length ?? 0).toBe(1);
    vi.stubEnv('LEMONSQUEEZY_VARIANT_STAT_TABLES', '3');
    expect((await render()).match(/<button/g)?.length ?? 0).toBe(2);
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

  it('leads each product with its outcome and states its limit', async () => {
    const html = await render();
    for (const product of BILLING_PRODUCTS) {
      const escaped = (text: string) => text.replace(/'/g, '&#x27;');
      expect(html).toContain(escaped(product.outcome));
      expect(html).toContain(escaped(product.caveat));
      expect(html).toContain(`id="product-${product.key}"`);
    }
  });

  it('lists what stays free before the first price', async () => {
    const html = await render();
    expect(html.indexOf('Already yours, free')).toBeGreaterThan(-1);
    expect(html.indexOf('Already yours, free')).toBeLessThan(html.indexOf('$19</p>'));
  });

  it('uses no manufactured urgency, popularity, or discount', async () => {
    const html = (await render()).toLowerCase();
    for (const phrase of ['most popular', 'limited time', 'only a few', 'hurry', 'best value', '% off', 'was $']) {
      expect(html, phrase).not.toContain(phrase);
    }
    expect(html).not.toContain('<s>');
    expect(html).not.toContain('<del');
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
    expect(html.match(/<button/g)?.length ?? 0).toBe(1);
  });

  it('does not expose checkout API credentials or variant IDs in rendered markup', async () => {
    vi.stubEnv('LEMONSQUEEZY_API_KEY', 'private-key-never-render');
    vi.stubEnv('LEMONSQUEEZY_STORE_ID', 'private-store-never-render');
    vi.stubEnv('LEMONSQUEEZY_VARIANT_TEARDOWN', 'private-variant-one-never-render');
    vi.stubEnv('LEMONSQUEEZY_VARIANT_STAT_TABLES', 'private-variant-two-never-render');
    getDashboardUser.mockResolvedValueOnce({ id: 'user-1', email: 'r@example.org', name: 'R', isEditor: false });
    const html = await render();
    expect(html).not.toContain('private-key-never-render');
    expect(html).not.toContain('private-store-never-render');
    expect(html).not.toContain('private-variant-one-never-render');
    expect(html).not.toContain('private-variant-two-never-render');
  });

  it('is in the sitemap with a stable priority', async () => {
    const entries = await sitemap();
    const pricing = entries.find((entry) => new URL(entry.url).pathname === '/pricing');
    expect(pricing).toBeDefined();
    expect(pricing?.priority).toBe(0.6);
    expect(pricing?.changeFrequency).toBe('monthly');
  });
});
