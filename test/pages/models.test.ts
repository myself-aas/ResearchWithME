import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestApp } from '@/test/support/pages';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

const JSON_HEADERS = { 'content-type': 'application/json' };
const GEMINI_ENV = { GEMINI_API_KEY: 'test-gemini-key' } as const;

describe('POST /api/research-assistant', () => {
  it('keeps the offline fallback answering from the CMS catalogue', async () => {
    const app = createTestApp();
    await app.seedPost({
      slug: 'inside-vllm-paged-attention',
      status: 'published',
      title: 'Inside vLLM & PagedAttention',
      summary: 'Teardown of PagedAttention in vLLM.',
      tags: ['vllm', 'llm-serving'],
    });
    const a = await app.request('/api/research-assistant', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ query: 'vLLM' }),
    });
    expect(a.status).toBe(200);
    const body = await a.json();
    expect(body.mode).toBe('catalog');
    expect(body.answer.toLowerCase()).toContain('vllm');
    expect(body.citations.length).toBeGreaterThan(0);
    expect(body.citations[0].title).toMatch(/vllm/i);
  });

  it('answers honestly when nothing matches and the catalogue is the only source', async () => {
    const app = createTestApp();
    const res = await app.request('/api/research-assistant', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ query: 'zyxqwv nonexistent topos' }),
    });
    const body = await res.json();
    expect(body.mode).toBe('catalog');
    expect(body.citations).toEqual([]);
    expect(body.answer).toContain('No direct match');
  });

  it('rejects non-JSON bodies, empty questions and malformed JSON', async () => {
    const app = createTestApp();
    const wrongType = await app.request('/api/research-assistant', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'vLLM',
    });
    expect(wrongType.status).toBe(415);

    const empty = await app.request('/api/research-assistant', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ query: '   ' }),
    });
    expect(empty.status).toBe(400);

    const malformed = await app.request('/api/research-assistant', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: '{nope',
    });
    expect(malformed.status).toBe(400);
  });

  it('uses the injected model when a key is configured, and degrades on model outage', async () => {
    const modelled = createTestApp({ env: { ...GEMINI_ENV } });
    const ok = await modelled.request('/api/research-assistant', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ query: 'vLLM' }),
    });
    const okBody = await ok.json();
    expect(okBody.mode).toBe('model');
    expect(okBody.answer).toBeTruthy();

    const broken = createTestApp({ env: { ...GEMINI_ENV }, modelTextThrows: true });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const degraded = await broken.request('/api/research-assistant', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ query: 'vLLM' }),
    });
    const body = await degraded.json();
    expect(degraded.status).toBe(200);
    expect(body.mode).toBe('catalog');
    expect(body.notice).toContain('language model was unavailable');
  });

  it('rate-limits the thirteenth question in a minute', async () => {
    const app = createTestApp();
    const ip = { 'x-forwarded-for': '203.0.113.123' };
    for (let index = 0; index < 12; index += 1) {
      const res = await app.request('/api/research-assistant', {
        method: 'POST',
        headers: { ...JSON_HEADERS, ...ip },
        body: JSON.stringify({ query: `vLLM ${index}` }),
      });
      expect(res.status).toBe(200);
    }
    const limited = await app.request('/api/research-assistant', {
      method: 'POST',
      headers: { ...JSON_HEADERS, ...ip },
      body: JSON.stringify({ query: 'vLLM again' }),
    });
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
  });
});
