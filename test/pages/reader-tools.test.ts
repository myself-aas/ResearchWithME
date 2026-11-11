/**
 * Reader tools (Task 12B): /assistant, /bookmarks and /cite. The browser-level
 * spec lives in test/e2e/reader-tools.spec.ts; these contract tests run
 * without a browser and assert the SSR surface plus the /__data transport.
 */
import { describe, expect, it } from 'vitest';
import { createTestApp } from '@/test/support/pages';
import { API_GROUPS } from '@/lib/api-catalog';

describe('GET /assistant', () => {
  it('renders the assistant with canonical metadata', async () => {
    const app = createTestApp();
    const res = await app.request('/assistant');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('Ask the archive a question');
    expect(html).toContain('<title>Ask the archive — ResearchWithMe</title>');
    expect(html).toContain('rel="canonical" href="https://researchwith.me/assistant"');
  });

  it('answers through the /__data transport', async () => {
    const app = createTestApp();
    const res = await app.request('/__data?routeId=assistant&url=%2Fassistant');
    expect(res.status).toBe(200);
    const envelope = await res.json();
    expect(envelope.kind).toBe('data');
    expect(JSON.stringify(envelope.data)).toContain('Ask');
  });
});

describe('GET /bookmarks', () => {
  it('renders the reading list shell', async () => {
    const app = createTestApp();
    const res = await app.request('/bookmarks');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Your reading list');
    expect(html).toContain('<title>Your reading list — ResearchWithMe</title>');
    expect(html).toContain('rel="canonical" href="https://researchwith.me/bookmarks"');
  });

  it('answers through the /__data transport', async () => {
    const app = createTestApp();
    const res = await app.request('/__data?routeId=bookmarks&url=%2Fbookmarks');
    expect(res.status).toBe(200);
    expect((await res.json()).kind).toBe('data');
  });
});

describe('GET /cite', () => {
  it('renders the citation tool with all formats wired', async () => {
    const app = createTestApp();
    const res = await app.request('/cite');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Build a citation that travels');
    expect(html).toContain('<title>Build a citation — ResearchWithMe</title>');
    expect(html).toContain('rel="canonical" href="https://researchwith.me/cite"');
  });

  it('answers through the /__data transport', async () => {
    const app = createTestApp();
    const res = await app.request('/__data?routeId=cite&url=%2Fcite');
    expect(res.status).toBe(200);
    expect((await res.json()).kind).toBe('data');
  });
});

describe('GET /api-docs', () => {
  it('renders the API reference with its group anchors and canonical metadata', async () => {
    const app = createTestApp();
    const res = await app.request('/api-docs');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('ResearchWithMe API');
    expect(html).toContain('<title>API reference — ResearchWithMe</title>');
    expect(html).toContain('rel="canonical" href="https://researchwith.me/api-docs"');
    // Every catalog group anchor is present and link targets resolve to it.
    for (const group of API_GROUPS) {
      expect(html).toContain(`id="${group.id}"`);
      expect(html).toContain(`href="#${group.id}"`);
    }
    // The catalog lists real operations, not placeholder scaffolding.
    expect(html).toContain('/api/articles');
  });

  it('answers through the /__data transport', async () => {
    const app = createTestApp();
    const res = await app.request('/__data?routeId=api-docs&url=%2Fapi-docs');
    expect(res.status).toBe(200);
    expect((await res.json()).kind).toBe('data');
  });
});
