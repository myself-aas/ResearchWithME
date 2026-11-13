import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { GET as nextDirectory } from '@/app/.well-known/http-message-signatures-directory/route';
import { createTestApp } from '@/test/support/pages';
import { signedBotRequest, WEB_BOT_DIRECTORY, webBotDirectoryResponse } from '@/lib/web-bot-auth';

let privateJwk: string;
let verifyKey: CryptoKey;

beforeAll(async () => {
  const pair = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']);
  privateJwk = JSON.stringify(await crypto.subtle.exportKey('jwk', pair.privateKey));
  verifyKey = pair.publicKey;
});
afterAll(() => { privateJwk = ''; });

describe('Web Bot Auth', () => {
  it('publishes only the public JWK with a thumbprint kid on Pages', async () => {
    const app = createTestApp({ env: { WEB_BOT_AUTH_PRIVATE_JWK: privateJwk } });
    const response = await app.request(WEB_BOT_DIRECTORY);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/http-message-signatures-directory+json');
    const { keys } = await response.json();
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatchObject({ kty: 'OKP', crv: 'Ed25519', use: 'sig', kid: expect.stringMatching(/^[\w-]{43}$/) });
    expect(keys[0]).not.toHaveProperty('d');
    const publicJwk = JSON.parse(privateJwk);
    expect(keys[0].x).toBe(publicJwk.x);
    vi.stubEnv('WEB_BOT_AUTH_PRIVATE_JWK', privateJwk);
    try {
      const next = await nextDirectory();
      expect(next.status).toBe(200);
      expect(await next.json()).toEqual({ keys });
    } finally {
      vi.unstubAllEnvs();
    }
    expect((await app.request(WEB_BOT_DIRECTORY, { method: 'HEAD' })).status).toBe(200);
    expect(await (await app.request(WEB_BOT_DIRECTORY, { method: 'HEAD' })).text()).toBe('');
  });

  it('signs a concrete outbound GET with RFC 9421 headers verifiable by the directory key', async () => {
    const request = await signedBotRequest('https://example.org/robots.txt?x=1', privateJwk, 'https://researchwith.me');
    expect(request.headers.get('signature-agent')).toBe(`sig="https://researchwith.me${WEB_BOT_DIRECTORY}"`);
    const input = request.headers.get('signature-input')!;
    const signature = request.headers.get('signature')!;
    const jwks = await (await webBotDirectoryResponse(privateJwk, 'GET')).json();
    expect(input).toContain(`keyid="${jwks.keys[0].kid}"`);
    expect(input).toContain('tag="web-bot-auth"');
    expect(signature).toMatch(/^sig=:[A-Za-z0-9+/]+=*:\s*$/);
    const params = input.replace(/^sig=/, '');
    const base = [
      '"@method": GET',
      '"@authority": example.org',
      '"@target-uri": https://example.org/robots.txt?x=1',
      `"signature-agent";key="sig": "https://researchwith.me${WEB_BOT_DIRECTORY}"`,
      `"@signature-params": ${params}`,
    ].join('\n');
    const signatureBytes = Uint8Array.from(atob(signature.slice(5, -1)), (c) => c.charCodeAt(0));
    expect(await crypto.subtle.verify('Ed25519', verifyKey, signatureBytes, new TextEncoder().encode(base))).toBe(true);
    expect(await crypto.subtle.verify('Ed25519', verifyKey, signatureBytes, new TextEncoder().encode(base.replace('GET', 'POST')))).toBe(false);
  });

  it('fails closed without a key or with an invalid key and refuses HTTP targets', async () => {
    expect((await webBotDirectoryResponse(undefined, 'GET')).status).toBe(503);
    expect((await webBotDirectoryResponse('{"bad":true}', 'GET')).status).toBe(503);
    await expect(signedBotRequest('http://example.org/', privateJwk, 'https://researchwith.me')).rejects.toThrow('HTTPS');
  });
});
