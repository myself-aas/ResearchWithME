import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, FAKE_SUPABASE_URL } from '@/test/support/pages';
import { oauthDiscoveryResponse } from '@/lib/oauth-discovery';

const metadata = {
  issuer: `${FAKE_SUPABASE_URL}/auth/v1`,
  authorization_endpoint: `${FAKE_SUPABASE_URL}/auth/v1/oauth/authorize`,
  token_endpoint: `${FAKE_SUPABASE_URL}/auth/v1/oauth/token`,
  jwks_uri: `${FAKE_SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
  grant_types_supported: ['authorization_code', 'refresh_token'],
  response_types_supported: ['code'],
};

afterEach(() => vi.unstubAllGlobals());

describe('Supabase OAuth discovery mirror', () => {
  it('serves upstream metadata without rewriting its issuer in Pages and the shared Next handler', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => Response.json(metadata));
    vi.stubGlobal('fetch', fetchMock);
    const app = createTestApp();
    const pages = await app.request('/.well-known/oauth-authorization-server');
    const next = await oauthDiscoveryResponse(FAKE_SUPABASE_URL, 'GET');
    for (const response of [pages, next]) {
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
      // Every upstream field is relayed verbatim — the issuer above all — and the
      // only addition is the Auth.md `agent_auth` block (see
      // test/pages/agent-auth-discovery.test.ts). Asserting deep equality on the
      // whole document would forbid that addition; asserting the upstream subset
      // keeps the guarantee that matters: nothing is rewritten.
      const doc = await response.json();
      expect(doc).toMatchObject(metadata);
      expect(Object.keys(doc).sort()).toEqual([...Object.keys(metadata), 'agent_auth'].sort());
    }
    expect(fetchMock).toHaveBeenCalledWith(
      new URL(`${FAKE_SUPABASE_URL}/auth/v1/.well-known/oauth-authorization-server`),
      // 'manual', not 'error': workerd rejects 'error' outright, which made the
      // fetch throw before it was sent and left the relay serving the snapshot.
      expect.objectContaining({ redirect: 'manual', cache: 'no-store' }),
    );
  });

  it('fails closed for disabled OAuth servers, malformed metadata, and unexpected issuers', async () => {
    for (const result of [
      new Response(null, { status: 404 }),
      Response.json({ ...metadata, issuer: 'https://attacker.test/auth/v1' }),
      Response.json({ ...metadata, token_endpoint: 'https://attacker.test/token' }),
      Response.json({ ...metadata, response_types_supported: [] }),
    ]) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(result));
      const response = await oauthDiscoveryResponse(FAKE_SUPABASE_URL, 'GET');
      expect(response.status).toBe(503);
      expect(response.headers.get('cache-control')).toBe('no-store');
    }
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect((await oauthDiscoveryResponse('https://attacker.test/path', 'GET')).status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('allows HEAD without a body and refuses writes without fetching', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => Response.json(metadata));
    vi.stubGlobal('fetch', fetchMock);
    const head = await oauthDiscoveryResponse(FAKE_SUPABASE_URL, 'HEAD');
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
    const post = await oauthDiscoveryResponse(FAKE_SUPABASE_URL, 'POST');
    expect(post.status).toBe(405);
    expect(post.headers.get('allow')).toBe('GET, HEAD');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
