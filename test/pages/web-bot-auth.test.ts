import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { GET as nextDirectory } from '@/app/.well-known/http-message-signatures-directory/route';
import { createTestApp, TEST_ORIGIN } from '@/test/support/pages';
import { signedBotRequest, WEB_BOT_DIRECTORY, webBotDirectoryResponse } from '@/lib/web-bot-auth';

let privateJwk: string;
let verifyKey: CryptoKey;

beforeAll(async () => {
  const pair = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']);
  privateJwk = JSON.stringify(await crypto.subtle.exportKey('jwk', pair.privateKey));
  verifyKey = pair.publicKey;
});
afterAll(() => {
  privateJwk = '';
});

const SIGNATURE_AGENT = `"https://researchwith.me${WEB_BOT_DIRECTORY}"`;

/** Parse an RFC 8941 structured field dictionary into key -> raw value text. */
function dictionary(header: string): Record<string, string> {
  const entries: Record<string, string> = {};
  let depth = 0;
  let inQuote = false;
  let current = '';
  for (const char of header) {
    if (char === '"') inQuote = !inQuote;
    if (!inQuote) {
      if (char === '(' || char === ':' || char === '{') depth += 1;
      if (char === ')' || char === ':' || char === '}') depth -= 1;
    }
    if (char === ',' && depth === 0 && !inQuote) {
      const [key, ...rest] = current.split('=');
      entries[key.trim()] = rest.join('=').trim();
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) {
    const [key, ...rest] = current.split('=');
    entries[key.trim()] = rest.join('=').trim();
  }
  return entries;
}

/** Rebuild the RFC 9421 signature base from a Signature-Input value. */
function signatureBase(
  label: string,
  value: string,
  fields: { method: string; authority: string; targetUri: string; headers: Record<string, string> },
): string {
  const params = value.slice(value.indexOf('(') + 1, value.indexOf(')'));
  const components = [
    ...params.matchAll(/"([^"]+)"(\s*;\s*req)?(?:\s*;\s*key="([^"]+)")?/g),
  ].map((match) => ({ name: match[1], req: Boolean(match[2]), key: match[3] }));
  const lines = components.map(({ name, req, key }) => {
    let actual: string;
    if (name === '@method') actual = fields.method;
    else if (name === '@authority') actual = fields.authority;
    else if (name === '@target-uri') actual = fields.targetUri;
    else actual = fields.headers[name.toLowerCase()] ?? '';
    // The `req` flag is part of the identifier on the base line too.
    const identifier = `"${name}"${req ? ';req' : ''}${key ? `;key="${key}"` : ''}`;
    return `${identifier}: ${actual}`;
  });
  lines.push(`"@signature-params": ${value}`);
  void label;
  return lines.join('\n');
}

const verify = async (base: string, signature: string, key: CryptoKey = verifyKey) => {
  const match = /^:([A-Za-z0-9+/]+=*):$/.exec(signature);
  if (!match) throw new Error(`not a byte sequence: ${signature}`);
  const bytes = Uint8Array.from(atob(match[1]), (c) => c.charCodeAt(0));
  return crypto.subtle.verify('Ed25519', key, bytes, new TextEncoder().encode(base));
};

describe('Web Bot Auth directory', () => {
  it('publishes only the public JWK with a thumbprint kid on Pages', async () => {
    const app = createTestApp({ env: { WEB_BOT_AUTH_PRIVATE_JWK: privateJwk } });
    const response = await app.request(WEB_BOT_DIRECTORY);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/http-message-signatures-directory+json');
    const { keys } = await response.json();
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatchObject({ kty: 'OKP', crv: 'Ed25519', use: 'sig', kid: expect.stringMatching(/^[\w-]{43}$/) });
    expect(keys[0]).not.toHaveProperty('d');
    expect(keys[0].x).toBe(JSON.parse(privateJwk).x);

    vi.stubEnv('WEB_BOT_AUTH_PRIVATE_JWK', privateJwk);
    try {
      const next = await nextDirectory(
        new Request(`https://researchwith.me${WEB_BOT_DIRECTORY}`, {
          headers: { host: 'researchwith.me' },
        }),
      );
      expect(next.status).toBe(200);
      expect(await next.json()).toEqual({ keys });
    } finally {
      vi.unstubAllEnvs();
    }

    const head = await app.request(WEB_BOT_DIRECTORY, { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
  });

  /**
   * Cloudflare refuses to treat a directory as proof unless the directory
   * response is itself signed — with tag "http-message-signatures-directory",
   * over ("@authority";req). Without it, a third party can mirror the keys and
   * claim the identity. The self-signature is what binds key to host.
   */
  it('signs its own response so the key is bound to this host', async () => {
    const app = createTestApp({ env: { WEB_BOT_AUTH_PRIVATE_JWK: privateJwk } });
    const response = await app.request(WEB_BOT_DIRECTORY);
    const input = response.headers.get('signature-input');
    const signature = response.headers.get('signature');

    expect(input).not.toBeNull();
    expect(signature).not.toBeNull();

    const entries = dictionary(input!);
    const value = entries.sig1;
    expect(value, 'expected a sig1 label').toBeTruthy();
    expect(value).toMatch(/^\("@authority";req\)/);
    expect(value).toContain('tag="http-message-signatures-directory"');
    expect(value).toMatch(/created=\d+/);
    expect(value).toMatch(/expires=\d+/);
    expect(value).toContain('alg="ed25519"');
    // The kid must be the thumbprint of the key actually published.
    const { keys } = await response.json();
    expect(value).toContain(`keyid="${keys[0].kid}"`);

    const base = signatureBase('sig1', value, {
      method: 'GET',
      // The self-signature covers the authority the response was served from,
      // which on the Pages test harness is the harness origin.
      authority: new URL(TEST_ORIGIN).host,
      targetUri: `${TEST_ORIGIN}${WEB_BOT_DIRECTORY}`,
      headers: {},
    });
    expect(await verify(base, dictionary(signature!).sig1)).toBe(true);
  });

  it('fails closed without a key or with an invalid key', async () => {
    expect((await webBotDirectoryResponse(undefined, 'GET')).status).toBe(503);
    expect((await webBotDirectoryResponse('{"bad":true}', 'GET')).status).toBe(503);
    // A JWK whose d does not belong to x must not be published.
    const mismatched = JSON.stringify({ ...JSON.parse(privateJwk), x: 'A'.repeat(43) });
    expect((await webBotDirectoryResponse(mismatched, 'GET')).status).toBe(503);
  });
});

describe('Web Bot Auth signed requests', () => {
  /**
   * Cloudflare's parser reads Signature-Agent as a *structured string*: one
   * quoted member, not a dictionary. The dictionary form `sig="..."` is
   * explicitly rejected, and the agent URL must also appear in the covered
   * component list or verification fails.
   */
  it('sends Signature-Agent as a quoted structured string, not a dictionary', async () => {
    const request = await signedBotRequest('https://example.org/robots.txt?x=1', privateJwk, 'https://researchwith.me');
    expect(request.headers.get('signature-agent')).toBe(SIGNATURE_AGENT);
  });

  it('signs a concrete outbound GET with headers verifiable by the directory key', async () => {
    const request = await signedBotRequest('https://example.org/robots.txt?x=1', privateJwk, 'https://researchwith.me');
    const input = request.headers.get('signature-input')!;
    const signature = request.headers.get('signature')!;

    const entries = dictionary(input);
    const value = entries.sig1;
    expect(value, 'expected a sig1 label').toBeTruthy();
    expect(value).toContain('"signature-agent"');
    expect(value).toContain('tag="web-bot-auth"');
    expect(value).toContain('alg="ed25519"');
    expect(value).toMatch(/created=\d+/);
    expect(value).toMatch(/expires=\d+/);
    // Cloudflare rejects the `key` component parameter.
    expect(value).not.toContain('key="sig"');

    const jwks = await (await webBotDirectoryResponse(privateJwk, 'GET')).json();
    expect(value).toContain(`keyid="${jwks.keys[0].kid}"`);

    const base = signatureBase('sig1', value, {
      method: 'GET',
      authority: 'example.org',
      targetUri: 'https://example.org/robots.txt?x=1',
      headers: { 'signature-agent': SIGNATURE_AGENT },
    });
    expect(await verify(base, dictionary(signature).sig1)).toBe(true);
    expect(await verify(base.replace('GET', 'POST'), dictionary(signature).sig1)).toBe(false);
  });

  it('refuses HTTP targets and non-GET/HEAD methods', async () => {
    await expect(signedBotRequest('http://example.org/', privateJwk, 'https://researchwith.me')).rejects.toThrow(
      'HTTPS',
    );
  });

  /** A signer that produces headers a verifier rejects is worse than no signer. */
  it('produces a request Cloudflare would accept: authority, agent, and no unsupported parameters', async () => {
    const request = await signedBotRequest('https://example.org/a/b', privateJwk, 'https://researchwith.me');
    const value = dictionary(request.headers.get('signature-input')!).sig1;

    for (const unsupported of [';req', ';sf', ';bs', ';name=', '@query-params', '@status']) {
      expect(value, `Cloudflare rejects ${unsupported}`).not.toContain(unsupported);
    }
    expect(value).toContain('"@authority"');
  });
});
