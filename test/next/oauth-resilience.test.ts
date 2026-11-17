import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadDiscovery, oauthDiscoveryResponse } from '@/lib/oauth-discovery';
import { OAUTH_METADATA_SNAPSHOT } from '@/lib/oauth-metadata';
import { GET as oidcGet } from '@/app/.well-known/openid-configuration/route';
import { GET as oauthGet } from '@/app/.well-known/oauth-authorization-server/route';

const FAKE_SUPABASE_URL = 'https://example-project.supabase.co';

const metadata = {
  issuer: `${FAKE_SUPABASE_URL}/auth/v1`,
  authorization_endpoint: `${FAKE_SUPABASE_URL}/auth/v1/oauth/authorize`,
  token_endpoint: `${FAKE_SUPABASE_URL}/auth/v1/oauth/token`,
  jwks_uri: `${FAKE_SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
  grant_types_supported: ['authorization_code', 'refresh_token'],
  response_types_supported: ['code'],
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('OAuth discovery resilience', () => {
  it('serves live upstream metadata when the fetch succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => Response.json(metadata)));
    const response = await oauthDiscoveryResponse(FAKE_SUPABASE_URL, 'GET');
    expect(response.status).toBe(200);
    expect(response.headers.get('x-researchwithme-source')).toBe('upstream');
    const doc = await response.json();
    expect(doc.issuer).toBe(metadata.issuer);
    expect(doc.grant_types_supported).toEqual(metadata.grant_types_supported);
  });

  it('falls back to the snapshot for the same issuer when the fetch fails', async () => {
    for (const failure of [
      vi.fn().mockRejectedValue(new Error('ECONNRESET')),
      vi.fn().mockResolvedValue(new Response(null, { status: 500 })),
      vi.fn().mockResolvedValue(new Response('not json', { status: 200 })),
    ]) {
      vi.stubGlobal('fetch', failure);
      const response = await oauthDiscoveryResponse(OAUTH_METADATA_SNAPSHOT.issuerOrigin, 'GET');
      expect(response.status).toBe(200);
      expect(response.headers.get('x-researchwithme-source')).toBe('snapshot');

      const doc = await response.json();
      for (const field of ['issuer', 'authorization_endpoint', 'token_endpoint', 'jwks_uri']) {
        expect(typeof doc[field]).toBe('string');
        expect(doc[field]).not.toBe('');
      }
      expect(Array.isArray(doc.grant_types_supported)).toBe(true);
      expect(Array.isArray(doc.response_types_supported)).toBe(true);
      expect(doc.issuer).toBe(OAUTH_METADATA_SNAPSHOT.document.issuer);
    }
  });

  it('refuses the snapshot for a different project', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')));
    const response = await oauthDiscoveryResponse('https://otherproject.supabase.co', 'GET');
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain('agent_auth');
  });

  it('marks the fallback as stale, and does not let it be cached as fresh', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    const response = await oauthDiscoveryResponse(OAUTH_METADATA_SNAPSHOT.issuerOrigin, 'GET');
    expect(response.headers.get('cache-control')).toContain('max-age=60');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await oauthDiscoveryResponse(OAUTH_METADATA_SNAPSHOT.issuerOrigin, 'GET');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('accepts a trailing slash in the configured project URL', async () => {
    for (const configured of [FAKE_SUPABASE_URL, `${FAKE_SUPABASE_URL}/`]) {
      vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => Response.json(metadata)));
      const response = await oauthDiscoveryResponse(configured, 'GET');
      expect(response.status).toBe(200);
      expect((await response.json()).issuer).toBe(metadata.issuer);
    }
  });

  it('serves the same document at the OIDC and OAuth well-known paths', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', FAKE_SUPABASE_URL);
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => Response.json(metadata)));
    const oidc = await oidcGet();
    const oauth = await oauthGet();

    expect(oidc.status).toBe(200);
    expect(oauth.status).toBe(200);
    expect(oidc.headers.get('content-type')).toContain('application/json');
    const [a, b] = [await oidc.json(), await oauth.json()];
    expect(a.issuer).toBe(b.issuer);
    expect(a.authorization_endpoint).toBe(b.authorization_endpoint);
    expect(a.token_endpoint).toBe(b.token_endpoint);
    expect(a.jwks_uri).toBe(b.jwks_uri);
    expect(a.agent_auth).toEqual(b.agent_auth);
  });
});

describe('fetch configuration the Workers runtime accepts', () => {
  it('never asks for redirect: error, which workerd rejects', async () => {
    const calls: (RequestInit | undefined)[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
        calls.push(init);
        return Response.json(metadata);
      }),
    );

    await loadDiscovery(FAKE_SUPABASE_URL);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.redirect).toBe('manual');
    expect(calls[0]?.redirect).not.toBe('error');
  });

  it('treats a redirect response as a failed round-trip, not as metadata', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        async () => new Response(null, { status: 302, headers: { location: 'https://elsewhere.test/' } }),
      ),
    );

    const result = await loadDiscovery(OAUTH_METADATA_SNAPSHOT.issuerOrigin);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.source).toBe('snapshot');
  });
});
