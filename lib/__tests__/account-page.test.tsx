import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import AccountPage, { metadata } from '@/app/dashboard/account/page';

const { list, usage, getUser } = vi.hoisted(() => ({ list: vi.fn(), usage: vi.fn(), getUser: vi.fn() }));
vi.mock('@/lib/cms/auth', () => ({ getDashboardUser: getUser }));
vi.mock('@/lib/api/key-store', () => ({ getApiKeyStore: () => ({ list }) }));
vi.mock('@/lib/api/ledger', () => ({ getLedger: () => ({ usage }), monthlyIncluded: () => 100 }));

async function render() {
  return renderToStaticMarkup(createElement(MemoryRouter, null, await AccountPage()));
}

beforeEach(() => {
  vi.resetAllMocks();
  getUser.mockResolvedValue({ id: 'user-1', email: 'reader@example.org', name: 'Reader', isEditor: false });
  list.mockResolvedValue([]);
  usage.mockResolvedValue({ requestsUsed: 0 });
});
afterEach(() => vi.restoreAllMocks());

describe('/dashboard/account without commerce', () => {
  it('keeps free API keys, monthly usage and the reference link', async () => {
    const html = await render();
    expect(list).toHaveBeenCalledWith('user-1');
    expect(usage).toHaveBeenCalledWith('user-1', 100);
    expect(html).toContain('id="api-keys-heading"');
    expect(html).toContain('0 of 100 answers used this month');
    expect(html).toContain('No keys yet. Create one to call the Assistant API.');
    expect(html).toContain('href="/api-docs#assistant-api"');
  });

  it('shows existing API keys and usage', async () => {
    list.mockResolvedValue([{ id: 'key-1', name: 'Notebook', prefix: 'rwm_example', createdAt: '2026-11-20T00:00:00Z', lastUsedAt: null, revokedAt: null }]);
    usage.mockResolvedValue({ requestsUsed: 7 });
    const html = await render();
    expect(html).toContain('Notebook');
    expect(html).toContain('7 of 100 answers used this month');
  });

  it('retains profile and settings links with accessible touch targets', async () => {
    const html = await render();
    expect(html).toContain('mx-auto w-full max-w-4xl');
    const chips = [...html.matchAll(/<a [^>]*>/g)].map((match) => match[0])
      .filter((tag) => /href="\/(?:dashboard\/profile|dashboard\/access#profile|settings)"/.test(tag));
    expect(chips).toHaveLength(4);
    for (const tag of chips) {
      expect(tag).toContain('min-h-11');
      expect(tag).toContain('focus-visible:outline-2');
    }
    expect(html).not.toMatch(/w-\[\d+px\]/);
  });

  it('explains a key loading failure without hiding profile settings', async () => {
    list.mockRejectedValue(new Error('offline'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const html = await render();
    expect(html).toContain('role="alert"');
    expect(html).toContain('API keys could not be loaded');
    expect(html).not.toContain('No keys yet');
    expect(html).toContain('href="/dashboard/profile"');
    expect(usage).toHaveBeenCalled();
  });

  it('does not invent zero usage when the ledger is unavailable', async () => {
    usage.mockRejectedValue(new Error('offline'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const html = await render();
    expect(html).not.toContain('0 of 100 answers used');
    expect(html).toContain('No keys yet');
    expect(html).toContain('href="/dashboard/profile"');
  });

  it('does not load keys or usage without an account', async () => {
    getUser.mockResolvedValue(null);
    const html = await render();
    expect(list).not.toHaveBeenCalled();
    expect(usage).not.toHaveBeenCalled();
    expect(html).toContain('no sign-in configured');
  });

  it('has no storefront, payment scripts, plans or purchase sections', async () => {
    const html = await render();
    expect(html).not.toMatch(/\/pricing|lemonsqueezy|buy-heading|plan-heading|purchases-heading|Co-pilot credits/i);
    const source = readFileSync('app/dashboard/account/page.tsx', 'utf8');
    expect(source).not.toContain('@/components/billing');
    expect(source).not.toContain('@/lib/billing');
    expect(source).not.toContain("from '@/components/BlogHeader'");
    expect(source).not.toContain("from '@/components/BlogFooter'");
  });

  it('stays out of search results', () => {
    expect(metadata.robots).toEqual({ index: false, follow: false, nocache: true });
  });
});
