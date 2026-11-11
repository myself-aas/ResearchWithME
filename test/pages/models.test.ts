import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, TEST_SITE_URL } from '@/test/support/pages';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

const JSON_HEADERS = { 'content-type': 'application/json' };
const SITE_HEADERS = { ...JSON_HEADERS, origin: TEST_SITE_URL, host: 'test.researchwith.me' };
const GEMINI_ENV = { GEMINI_API_KEY: 'test-gemini-key' } as const;
const HF_ENV = { HF_SPACE_NAME: 'team/cover-space', HF_TOKEN: 'hf_test_token_123' } as const;

const UNSAFE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
  '<script>alert(1)</script>' +
  '<rect width="200" height="200" onload="alert(2)"/>' +
  '</svg>';

describe('POST /api/research-assistant', () => {
  it('keeps the offline fallback answering from the catalogue', async () => {
    const app = createTestApp();
    const a = await app.request('/api/research-assistant', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ query: 'vLLM' }),
    });
    expect(a.status).toBe(200);
    const body = await a.json();
    expect(body.mode).toBe('catalog');
    expect(body.answer).toContain('vLLM');
    expect(body.citations[0].title).toMatch(/vllm/i);
    expect(body.citations[0]).toMatchObject({ id: 'post-1', author: expect.any(String), category: expect.any(String) });
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

describe('POST /api/author-avatar', () => {
  it('keeps the deterministic offline fallback for readers', async () => {
    const app = createTestApp();
    const avatar = await app.request('/api/author-avatar', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ name: 'Reader', domain: 'Science' }),
    });
    expect(avatar.status).toBe(200);
    const body = await avatar.json();
    expect(body.source).toBe('domain-fallback');
    expect(body.svg).toContain('<svg');
  });

  it('requires a name and a domain', async () => {
    const app = createTestApp();
    for (const payload of [{ domain: 'Science' }, { name: 'Reader' }, {}]) {
      const res = await app.request('/api/author-avatar', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(payload),
      });
      expect(res.status).toBe(400);
    }
  });

  it('never lets a model-written avatar spend the key for non-editors', async () => {
    for (const as of [undefined, 'reader' as const]) {
      const app = createTestApp({ env: { ...GEMINI_ENV } });
      const res = await app.request('/api/author-avatar', {
        ...(as ? { as } : {}),
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ name: 'Reader', domain: 'Science', forceAi: true }),
      });
      expect(res.status).toBe(403);
    }
  });

  it('serves a sanitised model avatar to editors and never a raw script', async () => {
    const app = createTestApp({ env: { ...GEMINI_ENV }, modelText: UNSAFE_SVG });
    const res = await app.request('/api/author-avatar', {
      as: 'editor',
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ name: 'Dr. Maya Lin', domain: 'Computer Systems', forceAi: true }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.source).toBe('gemini');
    expect(body.svg).toContain('<svg');
    expect(body.svg).not.toContain('<script');
    expect(body.svg).not.toMatch(/onload\s*=/i);
  });

  it('falls back when the model errors or returns no usable SVG', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const broken = createTestApp({ env: { ...GEMINI_ENV }, modelTextThrows: true });
    const res = await broken.request('/api/author-avatar', {
      as: 'editor',
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ name: 'Reader Example', domain: 'Science', forceAi: true }),
    });
    expect((await res.json()).source).toBe('domain-fallback');

    const garbage = createTestApp({ env: { ...GEMINI_ENV }, modelText: 'here is your avatar!' });
    const res2 = await garbage.request('/api/author-avatar', {
      as: 'editor',
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ name: 'Reader Example', domain: 'Science', forceAi: true }),
    });
    expect((await res2.json()).source).toBe('domain-fallback');
  });

  it('keeps the local avatar when no key is configured, even for editors asking', async () => {
    const app = createTestApp();
    const res = await app.request('/api/author-avatar', {
      as: 'editor',
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ name: 'Reader Example', domain: 'Science', forceAi: true }),
    });
    expect((await res.json()).source).toBe('domain-fallback');
  });

  it('escapes XML-significant characters in the fallback initials', async () => {
    const app = createTestApp();
    const res = await app.request('/api/author-avatar', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ name: '<Reader>', domain: 'Science' }),
    });
    const body = await res.json();
    expect(body.svg).not.toContain('<Reader>');
    expect(body.svg).toContain('&lt;');
  });

  it('rate-limits the seventh avatar request in a minute', async () => {
    const app = createTestApp();
    const ip = { 'x-forwarded-for': '198.51.100.155' };
    for (let index = 0; index < 6; index += 1) {
      const res = await app.request('/api/author-avatar', {
        method: 'POST',
        headers: { ...JSON_HEADERS, ...ip },
        body: JSON.stringify({ name: 'Reader', domain: 'Science' }),
      });
      expect(res.status).toBe(200);
    }
    const limited = await app.request('/api/author-avatar', {
      method: 'POST',
      headers: { ...JSON_HEADERS, ...ip },
      body: JSON.stringify({ name: 'Reader', domain: 'Science' }),
    });
    expect(limited.status).toBe(429);
  });
});

describe('GET /api/generate', () => {
  it('is editor-only and reports unconfigured deployments honestly', async () => {
    const app = createTestApp();
    expect((await app.request('/api/generate')).status).toBe(401);
    expect((await app.request('/api/generate', { as: 'reader' })).status).toBe(403);

    const editor = await app.request('/api/generate', { as: 'editor' });
    expect(editor.status).toBe(200);
    const body = await editor.json();
    expect(body).toMatchObject({ configured: false, spaceName: null, hasToken: false, endpoint: '/generate_avif' });
  });

  it('reports the configured space without leaking the token value', async () => {
    const app = createTestApp({ env: { ...HF_ENV } });
    const res = await app.request('/api/generate', { as: 'editor' });
    const body = await res.json();
    expect(body.configured).toBe(true);
    expect(body.spaceName).toBe('team/cover-space');
    expect(body.hasToken).toBe(true);
    expect(JSON.stringify(body)).not.toContain('hf_test_token_123');
  });
});

describe('POST /api/generate', () => {
  it('is same-origin and editor-only before any work happens', async () => {
    const app = createTestApp({ env: { ...HF_ENV } });
    const evil = await app.request('/api/generate', {
      as: 'editor',
      method: 'POST',
      headers: { ...JSON_HEADERS, origin: 'https://evil.example', host: 'test.researchwith.me' },
      body: JSON.stringify({ prompt: 'a cover' }),
    });
    expect(evil.status).toBe(403);

    expect(
      (
        await app.request('/api/generate', {
          method: 'POST',
          headers: SITE_HEADERS,
          body: JSON.stringify({ prompt: 'a cover' }),
        })
      ).status,
    ).toBe(401);
  });

  it('validates the prompt', async () => {
    const app = createTestApp({ env: { ...HF_ENV } });
    for (const payload of [{}, { prompt: '   ' }, { prompt: 'x'.repeat(1001) }]) {
      const res = await app.request('/api/generate', {
        as: 'editor',
        method: 'POST',
        headers: SITE_HEADERS,
        body: JSON.stringify(payload),
      });
      expect(res.status).toBe(400);
    }
  });

  it('returns 503 with needsConfig when the Space is not configured', async () => {
    const app = createTestApp();
    const res = await app.request('/api/generate', {
      as: 'editor',
      method: 'POST',
      headers: SITE_HEADERS,
      body: JSON.stringify({ prompt: 'a cover' }),
    });
    expect(res.status).toBe(503);
    expect((await res.json()).needsConfig).toBe(true);
  });

  it('generates a cover, clamps params, and never takes a token from the body', async () => {
    const app = createTestApp({ env: { ...HF_ENV } });
    const res = await app.request('/api/generate', {
      as: 'editor',
      method: 'POST',
      headers: SITE_HEADERS,
      body: JSON.stringify({
        prompt: 'an ink citation graph over a dark slate plate',
        seed: 2 ** 40,
        width: 99999,
        steps: 0,
        quality: 10_000,
        hf_token: 'hf_body_token_smuggled',
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ success: true, imageUri: 'data:image/avif;base64,RkFLRQ==', seed: 1234, format: 'avif' });

    const input = app.lastCoverInput;
    expect(input).not.toBeNull();
    expect(input!.space).toBe('team/cover-space');
    // Token comes from the environment only, never from the request body.
    expect(input!.token).toBe('hf_test_token_123');
    expect(input!.timeoutMs).toBe(60_000);
    expect(input!.params.seed).toBe(2 ** 31 - 1);
    expect(input!.params.width).toBe(2048);
    expect(input!.params.steps ?? input!.params.num_inference_steps).toBe(1);
    expect(input!.params.quality).toBe(100);
    expect(JSON.stringify(input)).not.toContain('hf_body_token_smuggled');
  });

  it('accepts a file-reference result as well as a data URI', async () => {
    const app = createTestApp({
      env: { ...HF_ENV },
      coverData: [{ url: 'https://spaces.example/cover.avif' }],
    });
    const res = await app.request('/api/generate', {
      as: 'editor',
      method: 'POST',
      headers: SITE_HEADERS,
      body: JSON.stringify({ prompt: 'a cover' }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).imageUri).toBe('https://spaces.example/cover.avif');
  });

  it('answers 502 without leaking Space internals or the token', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = createTestApp({ env: { ...HF_ENV }, coverThrows: true });
    const res = await app.request('/api/generate', {
      as: 'editor',
      method: 'POST',
      headers: SITE_HEADERS,
      body: JSON.stringify({ prompt: 'a cover' }),
    });
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(text).toContain('Cover generation is unavailable');
    expect(text).not.toContain('fake space outage');
    expect(text).not.toContain('hf_test_token_123');
  });

  it('rate-limits the eleventh cover in a minute', async () => {
    const app = createTestApp({ env: { ...HF_ENV } });
    const ip = { 'x-forwarded-for': '192.0.2.222' };
    for (let index = 0; index < 10; index += 1) {
      const res = await app.request('/api/generate', {
        as: 'editor',
        method: 'POST',
        headers: { ...SITE_HEADERS, ...ip },
        body: JSON.stringify({ prompt: `cover ${index}` }),
      });
      expect(res.status).toBe(200);
    }
    const limited = await app.request('/api/generate', {
      as: 'editor',
      method: 'POST',
      headers: { ...SITE_HEADERS, ...ip },
      body: JSON.stringify({ prompt: 'one cover too many' }),
    });
    expect(limited.status).toBe(429);
  });
});
