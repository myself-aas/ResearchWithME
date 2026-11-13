import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, TEST_ORIGIN, TEST_SITE_URL } from '@/test/support/pages';
import {
  createSupabaseServerClient,
  getDashboardUser,
  handleAuthCallback,
  requireEditor,
} from '@/cloudflare-pages/src/server/auth';
import { createReadOnlyCmsStore } from '@/cloudflare-pages/src/server/stores';
import { PublicConfigError } from '@/cloudflare-pages/src/server/context';

const LEGAL_HOST = new URL(TEST_SITE_URL).origin;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('PKCE auth callback on Pages', () => {
  it('redirects safely and preserves every refreshed cookie', async () => {
    const app = createTestApp({ exchange: 'success' });
    const res = await app.request('/auth/callback?code=ok&next=%2F%2Fevil.example');
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get('location')!).origin).toBe(LEGAL_HOST);
    expect(new URL(res.headers.get('location')!).pathname).toBe('/');
    expect(res.headers.getSetCookie()).toHaveLength(2);
    expect(res.headers.getSetCookie().join(';')).toContain('sb-test-auth-token.1=');
    expect(res.headers.get('cache-control')).toContain('no-store');
    expect(await requireEditor(app.context('reader'))).toMatchObject({ ok: false, status: 403 });
  });

  it('keeps a safe next path with its query on success', async () => {
    const app = createTestApp({ exchange: 'success' });
    const res = await app.request('/auth/callback?code=ok&next=%2Fdashboard%3Ftab%3Dposts');
    const target = new URL(res.headers.get('location')!);
    expect(target.origin).toBe(LEGAL_HOST);
    expect(target.pathname).toBe('/dashboard');
    expect(target.searchParams.get('tab')).toBe('posts');
    expect(res.headers.getSetCookie()).toHaveLength(2);
  });

  it.each([
    ['absolute', 'https%3A%2F%2Fevil.example%2Fphish'],
    ['protocol-relative', '%2F%2Fevil.example'],
    ['backslash', '%2F%5Cevil.example'],
    ['control characters', '%2F%0A%0Devil.example'],
    ['sign-in loop', '%2Flogin%3Fnext%3D%2Fdashboard'],
  ])('rejects a malicious next (%s) and lands on /', async (_label, next) => {
    const app = createTestApp({ exchange: 'success' });
    const res = await app.request(`/auth/callback?code=ok&next=${next}`);
    const target = new URL(res.headers.get('location')!);
    expect(target.origin).toBe(LEGAL_HOST);
    expect(target.pathname).toBe('/');
  });

  it('passes provider errors to /login without exchanging a code', async () => {
    const app = createTestApp({ exchange: 'failure' });
    const res = await app.request(
      '/auth/callback?error_description=access_denied%3Cscript%3E&next=%2Fwrite',
    );
    const target = new URL(res.headers.get('location')!);
    expect(target.origin).toBe(LEGAL_HOST);
    expect(target.pathname).toBe('/login');
    expect(target.searchParams.get('error_description')).toBe('access_denied<script>');
    expect(target.searchParams.get('next')).toBe('/write');
    expect(res.headers.get('cache-control')).toContain('no-store');
    expect(res.headers.getSetCookie()).toHaveLength(0);
  });

  it('reports a failed exchange to /login without setting cookies', async () => {
    const app = createTestApp({ exchange: 'failure' });
    const res = await app.request('/auth/callback?code=expired&next=%2Fdashboard');
    const target = new URL(res.headers.get('location')!);
    expect(target.pathname).toBe('/login');
    expect(target.searchParams.get('next')).toBe('/dashboard');
    expect(target.searchParams.get('error_description')).toContain('could not be completed');
    expect(res.headers.getSetCookie()).toHaveLength(0);
    expect(res.headers.get('cache-control')).toContain('no-store');
  });

  it('fails closed with a /login message when Supabase is not configured', async () => {
    const app = createTestApp({ configured: false });
    const res = await app.request('/auth/callback?code=ok&next=%2Fwrite');
    const target = new URL(res.headers.get('location')!);
    expect(target.pathname).toBe('/login');
    expect(target.searchParams.get('error_description')).toContain('not configured');
    expect(res.headers.getSetCookie()).toHaveLength(0);
  });

  it('reports a missing authorization code', async () => {
    const app = createTestApp();
    const res = await app.request('/auth/callback');
    const target = new URL(res.headers.get('location')!);
    expect(target.pathname).toBe('/login');
    expect(target.searchParams.get('error_description')).toContain('missing');
  });
});

describe('Pages editor gate', () => {
  it('isolates concurrent expired-session refreshes', async () => {
    const app = createTestApp({ expiredSessions: true });
    const reader = app.context('reader');
    const editor = app.context('editor');
    const [r, e] = await Promise.all([getDashboardUser(reader), getDashboardUser(editor)]);
    expect(r?.id).not.toBe(e?.id);
    expect([r?.isEditor, e?.isEditor]).toEqual([false, true]);
    const readerCookies = reader.cookies.apply(new Response()).headers.getSetCookie().join(';');
    expect(readerCookies).toContain('reader-refreshed-1');
    expect(readerCookies).toContain('reader-refreshed-2');
    expect(readerCookies).not.toContain('editor-refreshed-1');
    expect(editor.cookies.apply(new Response()).headers.getSetCookie()).toHaveLength(2);
  });

  it('returns 403 for a signed-in reader and 401 for anonymous', async () => {
    const app = createTestApp();
    expect(await requireEditor(app.context('reader'))).toMatchObject({ ok: false, status: 403 });
    expect(await requireEditor(app.context('anonymous'))).toMatchObject({ ok: false, status: 401 });
  });

  it('grants an editor with the supabase mode and their user record', async () => {
    const app = createTestApp();
    const gate = await requireEditor(app.context('editor'));
    expect(gate).toMatchObject({
      ok: true,
      mode: 'supabase',
      user: { email: 'editor@test.researchwith.me', isEditor: true },
    });
  });

  it('treats an allowlist read failure as a non-editor (fail closed)', async () => {
    const errors: unknown[] = [];
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args);
    });
    const app = createTestApp({ authorLookupFails: true });
    const user = await getDashboardUser(app.context('editor'));
    expect(user?.isEditor).toBe(false);
    expect(await requireEditor(app.context('editor'))).toMatchObject({ ok: false, status: 403 });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts authenticated callers without an Origin header', async () => {
    // Server-to-server and curl-style callers carry no Origin; the gate must
    // key off the session, not the header.
    const app = createTestApp();
    const ctx = app.context('editor');
    expect(ctx.request.headers.get('origin')).toBeNull();
    expect(await requireEditor(ctx)).toMatchObject({ ok: true, mode: 'supabase' });
  });

  it('fails closed with 503 on Pages when Supabase is not configured', async () => {
    const app = createTestApp({ configured: false });
    expect(await requireEditor(app.context('editor'))).toMatchObject({ ok: false, status: 503 });
    expect(await requireEditor(app.context('anonymous'))).toMatchObject({ ok: false, status: 503 });
    expect(await getDashboardUser(app.context('editor'))).toBeNull();
  });

  it('keeps the Node local demo gate for an unconfigured node-local runtime', async () => {
    const app = createTestApp({ configured: false, runtime: 'node-local' });
    expect(await requireEditor(app.context('editor'))).toEqual({
      ok: true,
      user: null,
      mode: 'local',
    });
  });

  it('throws PublicConfigError instead of guessing when the server client is built without config', () => {
    const app = createTestApp({ configured: false });
    expect(() => createSupabaseServerClient(app.context('editor'))).toThrow(PublicConfigError);
  });
});

describe('read-only public stores', () => {
  it('serves empty public CMS data and rejects every write', async () => {
    const cms = createReadOnlyCmsStore();
    expect(await cms.listPosts()).toEqual([]);
    expect(await cms.getPost('draft-1')).toBeNull();
    expect(await cms.getPostBySlug('draft-1')).toBeNull();
    expect(await cms.listComments()).toEqual([]);
    expect(await cms.listCommentsForPost('a-1')).toEqual([]);
    expect(await cms.listCommentCounts()).toEqual({});
    expect(await cms.getComment('c-1')).toBeNull();
    await expect(cms.incrementLikes('a-1')).rejects.toThrow(/read-only/i);
    await expect(cms.createComment('a-1', {
      authorName: 'Reader',
      content: 'No.',
    } as never)).rejects.toThrow(/read-only/i);
    await expect(cms.createPost({ slug: 'x' } as never)).rejects.toThrow(/read-only/i);
    await expect(cms.updatePost('a-1', {} as never)).rejects.toThrow(/read-only/i);
    await expect(cms.deletePost('a-1')).rejects.toThrow(/read-only/i);
    await expect(cms.deleteComment('c-1')).rejects.toThrow(/read-only/i);
  });
});

describe('handleAuthCallback wiring', () => {
  it('builds the redirect from the site origin, not the request origin', async () => {
    const app = createTestApp({ exchange: 'success' });
    const ctx = app.context('reader');
    const res = await handleAuthCallback({
      ...ctx,
      request: new Request(`${TEST_ORIGIN}/auth/callback?code=ok&next=%2Fwrite`),
    });
    expect(new URL(res.headers.get('location')!).origin).toBe(LEGAL_HOST);
  });
});
