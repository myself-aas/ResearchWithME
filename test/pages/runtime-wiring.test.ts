import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleRequest } from '@/cloudflare-pages/src/entry-server';

const row = {
  id: 42, title: 'Published fixture', slug: 'published-fixture', content: 'Evidence.', status: 'published',
  subtitle: '', summary: 'A fixture.', category: 'Research Reviews', format: 'Paper Review',
  author_id: 'fixture-writer', author_name: 'Fixture Writer', cover_image: null, tags: [], key_takeaways: [],
  read_time: '2 min read', featured: false, likes: 0, published_at: '2026-01-01T00:00:00Z',
  inserted_at: '2026-01-01T00:00:00Z', updated_at: null,
  artifact_type: null, artifact_title: null, artifact_url: null, artifact_identifier: null, artifact_meta: null,
};

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('Pages deployed entry point', () => {
  it('loads published CMS articles through an anonymous Supabase client', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'public-fixture-key');
    const calls: Array<{ url: string; authorization: string | null }> = [];
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const headers = new Headers(init?.headers);
      calls.push({ url, authorization: headers.get('authorization') });
      const data = url.includes('/rest/v1/posts') ? [row] : [];
      return new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
    });
    const request = new Request('https://site.example/api/articles', { headers: { cookie: 'sb-example-auth-token=untrusted-cookie' } });
    const response = await handleRequest(request, {}, 'pages');
    expect(response.status).toBe(200);
    const body = await response.json() as { articles: Array<{ id: string; title: string }> };
    expect(body.articles).toEqual([expect.objectContaining({ id: 'cms-42', title: 'Published fixture' })]);
    expect(calls.some((call) => call.url.includes('/rest/v1/posts'))).toBe(true);
    expect(calls.every((call) => call.authorization === 'Bearer public-fixture-key')).toBe(true);
  });

  it('uses the verified request session for editor CMS and keeps readers out', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'public-fixture-key');
    const token = (role: string) => [
      Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
      Buffer.from(JSON.stringify({ sub: role, exp: 4102444800, role: 'authenticated' })).toString('base64url'),
      'signature',
    ].join('.');
    const editorToken = token('editor');
    const readerToken = token('reader');
    const cookie = (accessToken: string) => `sb-example-auth-token=base64-${Buffer.from(JSON.stringify({ access_token: accessToken, refresh_token: 'refresh-fixture', expires_at: 4102444800, token_type: 'bearer' })).toString('base64url')}`;
    const calls: Array<{ path: string; authorization: string | null }> = [];
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const authorization = new Headers(init?.headers).get('authorization');
      calls.push({ path: url.pathname, authorization });
      if (url.pathname === '/auth/v1/user') {
        const id = authorization === `Bearer ${editorToken}` ? 'editor' : 'reader';
        return Response.json({ id, email: `${id}@example.test`, user_metadata: {} });
      }
      if (url.pathname === '/rest/v1/rpc/is_editor') return Response.json(authorization === `Bearer ${editorToken}`);
      if (url.pathname === '/rest/v1/posts') return Response.json([{ ...row, status: 'draft', title: 'Private draft' }]);
      return Response.json([]);
    });
    const request = (accessToken: string) => new Request('https://site.example/api/cms/posts', { headers: { cookie: cookie(accessToken) } });
    const editor = await handleRequest(request(editorToken), {}, 'pages');
    expect(editor.status).toBe(200);
    expect(await editor.json()).toMatchObject({ posts: [{ title: 'Private draft', status: 'draft' }], mode: 'supabase' });
    expect(calls.some((call) => call.path === '/rest/v1/posts' && call.authorization === `Bearer ${editorToken}`)).toBe(true);
    const publicResponse = await handleRequest(new Request('https://site.example/api/articles', { headers: { cookie: cookie(editorToken) } }), {}, 'pages');
    expect((await publicResponse.json() as { articles: unknown[] }).articles).toEqual([]);
    expect(calls.some((call) => call.path === '/rest/v1/posts' && call.authorization === 'Bearer public-fixture-key')).toBe(true);
    const before = calls.filter((call) => call.path === '/rest/v1/posts').length;
    const reader = await handleRequest(request(readerToken), {}, 'pages');
    expect(reader.status).toBe(403);
    expect(calls.filter((call) => call.path === '/rest/v1/posts')).toHaveLength(before);
    const anonymous = await handleRequest(new Request('https://site.example/api/cms/posts'), {}, 'pages');
    expect(anonymous.status).toBe(401);
  });

  it('keeps an unconfigured Pages CMS read-only and denies studio access', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    const list = await handleRequest(new Request('https://site.example/api/articles'), {}, 'pages');
    expect(await list.json()).toEqual({ articles: [], count: 0 });
    const studio = await handleRequest(new Request('https://site.example/api/cms/posts'), {}, 'pages');
    expect(studio.status).toBe(503);
    const reaction = await handleRequest(new Request('https://site.example/api/articles/cms-42', { method: 'PATCH' }), {}, 'pages');
    expect(reaction.status).toBe(503);
    vi.stubEnv('RWM_BUILD_TARGET', 'production');
    const production = await handleRequest(new Request('https://site.example/api/articles'), { RWM_DEPLOY_ENV: 'production' }, 'pages');
    expect(production.status).toBe(503);
  });
});
