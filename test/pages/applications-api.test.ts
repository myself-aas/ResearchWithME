import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, TEST_SITE_URL } from '@/test/support/pages';
import type { AuthorApplication } from '@/lib/applications';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

const READER_ID = '10000000-0000-4000-8000-000000000001';
const EDITOR_ID = '10000000-0000-4000-8000-000000000002';
const OTHER_ID = '10000000-0000-4000-8000-000000000099';

const JSON_HEADERS = { 'content-type': 'application/json' };
const SITE_HEADERS = { ...JSON_HEADERS, origin: TEST_SITE_URL, host: 'test.researchwith.me' };

const applicationRow = (
  overrides: Partial<AuthorApplication> = {},
): AuthorApplication => ({
  id: 1,
  user_id: READER_ID,
  provider: 'github',
  handle: 'reader-handle',
  display_name: 'Reader Example',
  statement: '',
  status: 'pending',
  reviewed_by: null,
  reviewed_at: null,
  review_note: '',
  created_at: '2026-02-01T00:00:00.000Z',
  updated_at: '2026-02-01T00:00:00.000Z',
  ...overrides,
});

describe('GET /api/dashboard/applications', () => {
  it('requires sign-in, and lets a reader inspect but not approve', async () => {
    const app = createTestApp();
    expect((await app.request('/api/dashboard/applications')).status).toBe(401);
    expect(
      (await app.request('/api/dashboard/applications', { as: 'reader' })).status,
    ).toBe(200);
    expect(
      (
        await app.request('/api/dashboard/applications/1', {
          as: 'reader',
          method: 'POST',
          headers: JSON_HEADERS,
          body: '{"approve":true}',
        })
      ).status,
    ).toBe(403);
  });

  it('shows a reader only their own rows, newest first, with no-store', async () => {
    const app = createTestApp({
      applications: [
        applicationRow({ id: 1, created_at: '2026-02-01T00:00:00.000Z' }),
        applicationRow({
          id: 2,
          user_id: OTHER_ID,
          provider: 'orcid',
          handle: 'other-handle',
          created_at: '2026-03-01T00:00:00.000Z',
        }),
        applicationRow({ id: 3, created_at: '2026-04-01T00:00:00.000Z' }),
      ],
    });
    const res = await app.request('/api/dashboard/applications', { as: 'reader' });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('no-store');
    const body = await res.json();
    expect(body.applications.map((entry: AuthorApplication) => entry.id)).toEqual([3, 1]);
  });

  it('shows an editor the whole queue', async () => {
    const app = createTestApp({
      applications: [
        applicationRow({ id: 1 }),
        applicationRow({ id: 2, user_id: OTHER_ID, provider: 'orcid', created_at: '2026-03-01T00:00:00.000Z' }),
        applicationRow({ id: 3, user_id: EDITOR_ID, provider: 'orcid', created_at: '2026-02-15T00:00:00.000Z' }),
      ],
    });
    const res = await app.request('/api/dashboard/applications', { as: 'editor' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.applications.map((entry: AuthorApplication) => entry.id)).toEqual([2, 3, 1]);
  });

  it('returns 503 when applications storage is misconfigured, without no-store', async () => {
    const app = createTestApp({ configured: false });
    const res = await app.request('/api/dashboard/applications');
    expect(res.status).toBe(503);
    expect((await res.json()).error).toContain('Applications need Supabase');
    expect(res.headers.get('cache-control')).toBeNull();
  });

  it('returns 503 when the applications query fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = createTestApp({ applicationsFail: true });
    const res = await app.request('/api/dashboard/applications', { as: 'reader' });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe('The application service could not be reached. Try again in a moment.');
    expect(res.headers.get('cache-control')).toBeNull();
  });
});

describe('POST /api/dashboard/applications', () => {
  it('records an application and returns it with no-store', async () => {
    const app = createTestApp();
    const res = await app.request('/api/dashboard/applications', {
      as: 'reader',
      method: 'POST',
      headers: SITE_HEADERS,
      body: JSON.stringify({ provider: 'GitHub', handle: 'octocat', statement: 'I write about retrieval.' }),
    });
    expect(res.status).toBe(201);
    expect(res.headers.get('cache-control')).toContain('no-store');
    const body = await res.json();
    expect(body.application.provider).toBe('github');
    expect(body.application.handle).toBe('octocat');
    expect(body.application.status).toBe('pending');
    expect(body.application.user_id).toBe(READER_ID);
    // The linked identity's account name fills in when displayName is omitted.
    expect(body.application.display_name).toBe('Reader Example');

    const mine = await (
      await app.request('/api/dashboard/applications', { as: 'reader' })
    ).json();
    expect(mine.applications).toHaveLength(1);
  });

  it('defaults displayName to the session name but honours an explicit value', async () => {
    const app = createTestApp();
    const res = await app.request('/api/dashboard/applications', {
      as: 'reader',
      method: 'POST',
      headers: SITE_HEADERS,
      body: JSON.stringify({ provider: 'orcid', handle: '0000-0002-1825-0097', displayName: '  Maya Lin  ' }),
    });
    expect(res.status).toBe(201);
    expect((await res.json()).application.display_name).toBe('Maya Lin');
  });

  it('rejects unsupported providers, missing handles and empty names with 400', async () => {
    const app = createTestApp();
    const post = (payload: Record<string, unknown>) =>
      app.request('/api/dashboard/applications', {
        as: 'reader',
        method: 'POST',
        headers: SITE_HEADERS,
        body: JSON.stringify(payload),
      });

    const provider = await post({ provider: 'gitlab', handle: 'octocat' });
    expect(provider.status).toBe(400);
    expect((await provider.json()).error).toContain('GitHub or ORCID');

    const missingProvider = await post({ handle: 'octocat' });
    expect(missingProvider.status).toBe(400);

    const handle = await post({ provider: 'github' });
    expect(handle.status).toBe(400);
    expect((await handle.json()).error).toContain('handle');

    const name = await post({ provider: 'github', handle: 'octocat', displayName: '   ' });
    expect(name.status).toBe(400);
    expect((await name.json()).error).toContain('name');
  });

  it('refuses an applicant who is already an editor', async () => {
    const app = createTestApp();
    const res = await app.request('/api/dashboard/applications', {
      as: 'editor',
      method: 'POST',
      headers: SITE_HEADERS,
      body: JSON.stringify({ provider: 'github', handle: 'editor-handle' }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('already has publishing access');
  });

  it('allows only one open application per account (different provider → 400)', async () => {
    const app = createTestApp();
    const first = await app.request('/api/dashboard/applications', {
      as: 'reader',
      method: 'POST',
      headers: SITE_HEADERS,
      body: JSON.stringify({ provider: 'github', handle: 'octocat' }),
    });
    expect(first.status).toBe(201);

    const second = await app.request('/api/dashboard/applications', {
      as: 'reader',
      method: 'POST',
      headers: SITE_HEADERS,
      body: JSON.stringify({ provider: 'orcid', handle: '0000-0002-1825-0097' }),
    });
    expect(second.status).toBe(400);
    expect((await second.json()).error).toContain('already under review');
  });

  it('updates the same-provider application in place instead of duplicating it', async () => {
    const app = createTestApp();
    const first = await app.request('/api/dashboard/applications', {
      as: 'reader',
      method: 'POST',
      headers: SITE_HEADERS,
      body: JSON.stringify({ provider: 'github', handle: 'old-handle' }),
    });
    const second = await app.request('/api/dashboard/applications', {
      as: 'reader',
      method: 'POST',
      headers: SITE_HEADERS,
      body: JSON.stringify({ provider: 'github', handle: 'new-handle' }),
    });
    expect(second.status).toBe(201);
    const firstId = (await first.json()).application.id;
    expect((await second.json()).application.id).toBe(firstId);

    const mine = await (
      await app.request('/api/dashboard/applications', { as: 'reader' })
    ).json();
    expect(mine.applications).toHaveLength(1);
    expect(mine.applications[0].handle).toBe('new-handle');
  });

  it('requires sign-in, JSON content and a same-origin caller', async () => {
    const app = createTestApp();
    expect(
      (
        await app.request('/api/dashboard/applications', {
          method: 'POST',
          headers: SITE_HEADERS,
          body: JSON.stringify({ provider: 'github', handle: 'octocat' }),
        })
      ).status,
    ).toBe(401);

    const wrongType = await app.request('/api/dashboard/applications', {
      as: 'reader',
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'not json',
    });
    expect(wrongType.status).toBe(415);

    const malformed = await app.request('/api/dashboard/applications', {
      as: 'reader',
      method: 'POST',
      headers: SITE_HEADERS,
      body: '{broken',
    });
    expect(malformed.status).toBe(400);

    const evilOrigin = await app.request('/api/dashboard/applications', {
      as: 'reader',
      method: 'POST',
      headers: { ...JSON_HEADERS, origin: 'https://evil.example', host: 'test.researchwith.me' },
      body: JSON.stringify({ provider: 'github', handle: 'octocat' }),
    });
    expect(evilOrigin.status).toBe(403);
  });

  it('rate-limits the sixth application attempt in a minute with Retry-After', async () => {
    const app = createTestApp();
    const ip = { 'x-forwarded-for': '203.0.113.90' };
    for (let index = 0; index < 5; index += 1) {
      const res = await app.request('/api/dashboard/applications', {
        as: 'reader',
        method: 'POST',
        headers: { ...SITE_HEADERS, ...ip },
        body: JSON.stringify({ provider: 'not-a-provider' }),
      });
      expect(res.status).toBe(400);
    }
    const limited = await app.request('/api/dashboard/applications', {
      as: 'reader',
      method: 'POST',
      headers: { ...SITE_HEADERS, ...ip },
      body: JSON.stringify({ provider: 'github', handle: 'octocat' }),
    });
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
  });

  it('returns 503 when the application service is unreachable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = createTestApp({ applicationsFail: true });
    const res = await app.request('/api/dashboard/applications', {
      as: 'reader',
      method: 'POST',
      headers: SITE_HEADERS,
      body: JSON.stringify({ provider: 'github', handle: 'octocat' }),
    });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toContain('could not be reached');
  });
});

describe('POST /api/dashboard/applications/:id (review)', () => {
  const seed = () => [
    applicationRow({ id: 7, user_id: READER_ID, created_at: '2026-02-02T00:00:00.000Z' }),
  ];

  it('lets an editor approve an application, writing reviewed_by/at', async () => {
    const app = createTestApp({ applications: seed() });
    const res = await app.request('/api/dashboard/applications/7', {
      as: 'editor',
      method: 'POST',
      headers: SITE_HEADERS,
      body: JSON.stringify({ approve: true, note: 'Looks solid.' }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('no-store');
    const body = await res.json();
    expect(body.application.status).toBe('approved');
    expect(body.application.reviewed_by).toBe(EDITOR_ID);
    expect(body.application.reviewed_at).toBeTruthy();
    expect(body.application.review_note).toBe('Looks solid.');
  });

  it('lets an editor reject an application, and coerces approve strictly', async () => {
    const app = createTestApp({ applications: seed() });
    const res = await app.request('/api/dashboard/applications/7', {
      as: 'editor',
      method: 'POST',
      headers: SITE_HEADERS,
      body: JSON.stringify({ approve: 1, note: 'Not enough public work yet.' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    // approve !== true, so this is a rejection.
    expect(body.application.status).toBe('rejected');
    expect(body.application.review_note).toBe('Not enough public work yet.');
  });

  it('makes the decision visible to both sessions afterwards', async () => {
    const app = createTestApp({ applications: seed() });
    const approve = await app.request('/api/dashboard/applications/7', {
      as: 'editor',
      method: 'POST',
      headers: SITE_HEADERS,
      body: JSON.stringify({ approve: true, note: '' }),
    });
    expect(approve.status).toBe(200);

    const readerView = await (
      await app.request('/api/dashboard/applications', { as: 'reader' })
    ).json();
    expect(readerView.applications[0].status).toBe('approved');

    const editorView = await (
      await app.request('/api/dashboard/applications', { as: 'editor' })
    ).json();
    expect(editorView.applications[0].status).toBe('approved');
  });

  it('rejects invalid and unknown ids with 400', async () => {
    const app = createTestApp({ applications: seed() });
    for (const id of ['abc', '0', '-3']) {
      const res = await app.request(`/api/dashboard/applications/${id}`, {
        as: 'editor',
        method: 'POST',
        headers: SITE_HEADERS,
        body: JSON.stringify({ approve: true }),
      });
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('That application does not exist.');
    }

    const unknown = await app.request('/api/dashboard/applications/9999', {
      as: 'editor',
      method: 'POST',
      headers: SITE_HEADERS,
      body: JSON.stringify({ approve: true }),
    });
    expect(unknown.status).toBe(400);
    expect((await unknown.json()).error).toBe('That application no longer exists.');
  });

  it('requires sign-in, editor access, JSON content and a same-origin caller', async () => {
    const app = createTestApp({ applications: seed() });
    expect(
      (
        await app.request('/api/dashboard/applications/7', {
          method: 'POST',
          headers: SITE_HEADERS,
          body: JSON.stringify({ approve: true }),
        })
      ).status,
    ).toBe(401);

    const wrongType = await app.request('/api/dashboard/applications/7', {
      as: 'editor',
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'approve=true',
    });
    expect(wrongType.status).toBe(415);

    const evilOrigin = await app.request('/api/dashboard/applications/7', {
      as: 'editor',
      method: 'POST',
      headers: { ...JSON_HEADERS, origin: 'https://evil.example', host: 'test.researchwith.me' },
      body: JSON.stringify({ approve: true }),
    });
    expect(evilOrigin.status).toBe(403);
  });

  it('returns 503 when the review service is unreachable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = createTestApp({ applications: seed(), applicationsFail: true });
    const res = await app.request('/api/dashboard/applications/7', {
      as: 'editor',
      method: 'POST',
      headers: SITE_HEADERS,
      body: JSON.stringify({ approve: true }),
    });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toContain('could not be reached');
  });

  it('rate-limits the thirty-first review action in a minute with Retry-After', async () => {
    const app = createTestApp({ applications: seed() });
    const ip = { 'x-forwarded-for': '198.51.100.71' };
    for (let index = 0; index < 30; index += 1) {
      const res = await app.request('/api/dashboard/applications/7', {
        as: 'editor',
        method: 'POST',
        headers: { ...SITE_HEADERS, ...ip },
        body: JSON.stringify({ approve: true }),
      });
      expect(res.status).toBe(200);
    }
    const limited = await app.request('/api/dashboard/applications/7', {
      as: 'editor',
      method: 'POST',
      headers: { ...SITE_HEADERS, ...ip },
      body: JSON.stringify({ approve: true }),
    });
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
  });
});
