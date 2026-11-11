import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp } from '@/test/support/pages';
import { getScenario } from '@/lib/email/scenarios';
import { createEmailSender, sendScenario } from '@/lib/email/send';

const { sendMock, ResendMock } = vi.hoisted(() => {
  const send = vi.fn();
  return {
    sendMock: send,
    ResendMock: vi.fn().mockImplementation(() => ({ emails: { send } })),
  };
});

vi.mock('resend', () => ({ Resend: ResendMock }));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

beforeEach(() => {
  sendMock.mockReset();
  // restoreAllMocks wipes the hoisted mockImplementation, so re-install it per test.
  ResendMock.mockClear();
  ResendMock.mockImplementation(() => ({ emails: { send: sendMock } }));
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_TPL_WELCOME;
});

const KEY = 'RESEND_TPL_WELCOME';
const sampleInput = () => {
  const scenario = getScenario('welcome')!;
  return { to: 'amara@example.org', entityId: 'user_123', variables: scenario.sample };
};

describe('POST /api/revalidate', () => {
  it('requires the webhook secret and preserves its response shape', async () => {
    const app = createTestApp({ env: { REVALIDATE_SECRET: 'test-secret' } });
    expect((await app.request('/api/revalidate', { method: 'POST' })).status).toBe(401);
    const ok = await app.request('/api/revalidate', {
      method: 'POST',
      headers: { 'x-revalidate-secret': 'test-secret' },
      body: '{}',
    });
    expect(await ok.json()).toMatchObject({ revalidated: true, paths: ['/', '/sitemap.xml'] });
  });

  it('is 503 (not 401) when no secret is configured on the deployment', async () => {
    const app = createTestApp();
    const res = await app.request('/api/revalidate', { method: 'POST', body: '{}' });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toContain('Revalidation is not configured');
  });

  it('honours the legacy MY_SECRET_TOKEN name and the legacy ?secret= query parameter', async () => {
    const legacy = createTestApp({ env: { MY_SECRET_TOKEN: 'legacy-secret' } });
    const ok = await legacy.request('/api/revalidate?secret=legacy-secret', {
      method: 'POST',
      body: '{}',
    });
    expect(ok.status).toBe(200);

    const wrong = await legacy.request('/api/revalidate?secret=not-it', {
      method: 'POST',
      body: '{}',
    });
    expect(wrong.status).toBe(401);
  });

  it('rejects a wrong secret with a bare 401 and an invalid slug is not reflected into paths', async () => {
    const app = createTestApp({ env: { REVALIDATE_SECRET: 'test-secret' } });
    const wrong = await app.request('/api/revalidate', {
      method: 'POST',
      headers: { 'x-revalidate-secret': 'nope' },
      body: '{}',
    });
    expect(wrong.status).toBe(401);
    expect((await wrong.json()).error).toBe('Invalid token.');

    const badSlug = await app.request('/api/revalidate', {
      method: 'POST',
      headers: { 'x-revalidate-secret': 'test-secret' },
      body: JSON.stringify({ table: 'posts', record: { slug: 'Bad Slug!' } }),
    });
    expect((await badSlug.json()).paths).toEqual(['/', '/sitemap.xml']);
  });

  it('revalidates the article path for a valid slug and preserves the table name', async () => {
    const app = createTestApp({ env: { REVALIDATE_SECRET: 'test-secret' } });
    const res = await app.request('/api/revalidate', {
      method: 'POST',
      headers: { 'x-revalidate-secret': 'test-secret' },
      body: JSON.stringify({ table: 'posts', record: { slug: 'my-post' } }),
    });
    expect(await res.json()).toMatchObject({
      revalidated: true,
      table: 'posts',
      paths: ['/', '/sitemap.xml', '/post/my-post'],
    });

    const oldRecord = await app.request('/api/revalidate', {
      method: 'POST',
      headers: { 'x-revalidate-secret': 'test-secret' },
      body: JSON.stringify({ table: 'posts', record: null, old_record: { slug: 'old-post' } }),
    });
    expect((await oldRecord.json()).paths).toEqual(['/', '/sitemap.xml', '/post/old-post']);
  });

  it('treats an unreadable body as an empty payload, not an error', async () => {
    const app = createTestApp({ env: { REVALIDATE_SECRET: 'test-secret' } });
    const res = await app.request('/api/revalidate', {
      method: 'POST',
      headers: { 'x-revalidate-secret': 'test-secret' },
      body: 'not json at all',
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ revalidated: true, paths: ['/', '/sitemap.xml'] });
  });

  it('rate-limits the sixty-first call in a minute', async () => {
    const app = createTestApp({ env: { REVALIDATE_SECRET: 'test-secret' } });
    const ip = { 'x-forwarded-for': '203.0.113.61' };
    for (let index = 0; index < 60; index += 1) {
      const res = await app.request('/api/revalidate', {
        method: 'POST',
        headers: { 'x-revalidate-secret': 'test-secret', ...ip },
        body: '{}',
      });
      expect(res.status).toBe(200);
    }
    const limited = await app.request('/api/revalidate', {
      method: 'POST',
      headers: { 'x-revalidate-secret': 'test-secret', ...ip },
      body: '{}',
    });
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toBeTruthy();
  });
});

describe('createEmailSender (env-bound factory)', () => {
  it('is a no-send skip when the injected env carries no key', async () => {
    const sender = createEmailSender({});
    await expect(sender.sendScenario('welcome', sampleInput())).resolves.toEqual({
      ok: false,
      skipped: true,
      reason: 'RESEND_API_KEY is not set.',
    });
    expect(ResendMock).not.toHaveBeenCalled();
  });

  it('honours the injected environment over process.env', async () => {
    process.env.RESEND_API_KEY = 'process-env-key';
    sendMock.mockResolvedValue({ data: { id: 'msg_pages' }, error: null });
    const sender = createEmailSender({ RESEND_API_KEY: 'pages-env-key' });

    const result = await sender.sendScenario('welcome', sampleInput());
    expect(result).toEqual({ ok: true, id: 'msg_pages', mode: 'local' });
    expect(ResendMock).toHaveBeenCalledWith('pages-env-key');
  });

  it('reads the template id from the injected env, never from process.env', async () => {
    process.env.RESEND_API_KEY = 'process-env-key';
    sendMock.mockResolvedValue({ data: { id: 'msg_tpl' }, error: null });
    const sender = createEmailSender({
      RESEND_API_KEY: 'pages-env-key',
      [KEY]: 'tpl_pages_123',
    });

    const result = await sender.sendScenario('welcome', sampleInput());
    expect(result).toEqual({ ok: true, id: 'msg_tpl', mode: 'template' });

    const [payload] = sendMock.mock.calls[0];
    expect(payload.template).toEqual({ id: 'tpl_pages_123', variables: sampleInput().variables });
    expect(payload).not.toHaveProperty('html');
  });

  it('reuses one client per factory instance and rebuilds across instances', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_memo' }, error: null });
    const a = createEmailSender({ RESEND_API_KEY: 'pages-env-key' });
    await a.sendScenario('welcome', sampleInput());
    await a.sendScenario('welcome', sampleInput());
    expect(ResendMock).toHaveBeenCalledTimes(1);

    const b = createEmailSender({ RESEND_API_KEY: 'pages-env-key' });
    await b.sendScenario('welcome', sampleInput());
    expect(ResendMock).toHaveBeenCalledTimes(2);
  });

  it('rotates the default sender client when process.env changes under it', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_rot' }, error: null });
    process.env.RESEND_API_KEY = 'key-before-rotation';
    await sendScenario('welcome', sampleInput());
    process.env.RESEND_API_KEY = 'key-after-rotation';
    await sendScenario('welcome', sampleInput());

    expect(ResendMock.mock.calls.map(([key]) => key)).toContain('key-before-rotation');
    expect(ResendMock.mock.calls.map(([key]) => key)).toContain('key-after-rotation');
  });

  it('skips Supabase-owned scenarios without constructing a client', async () => {
    const sender = createEmailSender({ RESEND_API_KEY: 'pages-env-key' });
    for (const key of ['verify-email', 'password-reset']) {
      const result = await sender.sendScenario(key, {
        to: 'amara@example.org',
        entityId: `entity-${key}`,
        variables: getScenario(key)!.sample,
      });
      expect(result).toMatchObject({ ok: false, skipped: true });
    }
    expect(ResendMock).not.toHaveBeenCalled();
  });

  it('sends html + text in local mode with explicit sender, subject, tags and idempotency', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_local' }, error: null });
    const sender = createEmailSender({ RESEND_API_KEY: 'pages-env-key' });

    const result = await sender.sendScenario('welcome', sampleInput());
    expect(result).toEqual({ ok: true, id: 'msg_local', mode: 'local' });

    const [payload, options] = sendMock.mock.calls[0];
    expect(payload.from).toBe('Research With Me <hello@researchwith.me>');
    expect(payload.subject).toBe('Welcome to ResearchWithMe, Amara');
    expect(payload.replyTo).toBe(getScenario('welcome')!.replyTo);
    expect(payload.html).toContain('<!DOCTYPE');
    expect(typeof payload.text).toBe('string');
    expect(payload.tags).toEqual([{ name: 'category', value: 'welcome' }]);
    expect(options).toEqual({ idempotencyKey: 'welcome/user_123' });
  });

  it('surfaces provider failures as results and never leaks the key', async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'from must be verified' },
    });
    const sender = createEmailSender({ RESEND_API_KEY: 'pages-env-key-secret' });

    const result = await sender.sendScenario('welcome', sampleInput());
    expect(result).toEqual({ ok: false, skipped: false, error: 'from must be verified' });
    expect(JSON.stringify(result)).not.toContain('pages-env-key-secret');
  });
});
