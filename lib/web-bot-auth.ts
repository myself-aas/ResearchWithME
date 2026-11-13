/** IETF Web Bot Auth HTTP Message Signatures (Ed25519, RFC 9421). */
export const WEB_BOT_DIRECTORY = '/.well-known/http-message-signatures-directory';
const MEDIA_TYPE = 'application/http-message-signatures-directory+json';

type SigningKey = { kty: 'OKP'; crv: 'Ed25519'; x: string; d: string };

function decodeKey(value: string): SigningKey {
  const key: unknown = JSON.parse(value);
  if (!key || typeof key !== 'object') throw new Error('Signing key is missing.');
  const jwk = key as Record<string, unknown>;
  if (jwk.kty !== 'OKP' || jwk.crv !== 'Ed25519' ||
      typeof jwk.x !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(jwk.x) ||
      typeof jwk.d !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(jwk.d)) {
    throw new Error('Expected a private Ed25519 JWK with x and d.');
  }
  return jwk as SigningKey;
}

function base64url(bytes: Uint8Array): string {
  // btoa and SubtleCrypto are supported in both Workers and Node runtimes.
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

async function publicKey(privateJwk: string) {
  const { x, d } = decodeKey(privateJwk);
  const jwk = { kty: 'OKP', crv: 'Ed25519', x };
  const thumbprint = new TextEncoder().encode(JSON.stringify({ crv: 'Ed25519', kty: 'OKP', x }));
  const kid = base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', thumbprint)));
  // Reject incorrectly paired private and public keys before publishing a
  // directory that cannot verify the signatures produced by this signer.
  const privateKey = await crypto.subtle.importKey('jwk', { ...jwk, d }, 'Ed25519', false, ['sign']);
  const verificationKey = await crypto.subtle.importKey('jwk', jwk, 'Ed25519', false, ['verify']);
  const probe = new TextEncoder().encode('web-bot-auth-key-check');
  const sig = await crypto.subtle.sign('Ed25519', privateKey, probe);
  if (!await crypto.subtle.verify('Ed25519', verificationKey, sig, probe)) throw new Error('Signing key pair does not match.');
  return { jwk: { ...jwk, kid, use: 'sig' }, kid, privateKey };
}

export async function webBotDirectoryResponse(privateJwk: string | undefined, method: string): Promise<Response> {
  if (method !== 'GET' && method !== 'HEAD') return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  try {
    const { jwk } = await publicKey(privateJwk ?? '');
    return new Response(method === 'HEAD' ? null : JSON.stringify({ keys: [jwk] }), {
      headers: { 'Content-Type': MEDIA_TYPE, 'Cache-Control': 'public, max-age=300' },
    });
  } catch {
    // Never publish a dummy key or leak the private key when not provisioned.
    return new Response('Web Bot Auth signing key is not configured.', {
      status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
}

/** Sign a GET/HEAD request to another site. Deliberately does not sign bodies. */
export async function signedBotRequest(url: string, privateJwk: string, siteUrl: string, method: 'GET' | 'HEAD' = 'GET'): Promise<Request> {
  const target = new URL(url);
  const site = new URL(siteUrl);
  if (target.protocol !== 'https:' || site.protocol !== 'https:' || target.username || target.password || target.hash) {
    throw new Error('Web Bot Auth requires HTTPS URLs without userinfo or fragments.');
  }
  const { kid, privateKey } = await publicKey(privateJwk);
  const signatureAgent = `${site.origin}${WEB_BOT_DIRECTORY}`;
  const created = Math.floor(Date.now() / 1000);
  const params = `("@method" "@authority" "@target-uri" "signature-agent";key="sig");created=${created};expires=${created + 300};keyid="${kid}";tag="web-bot-auth";alg="ed25519"`;
  const base = [
    `"@method": ${method}`,
    `"@authority": ${target.host}`,
    `"@target-uri": ${target.href}`,
    `"signature-agent";key="sig": "${signatureAgent}"`,
    `"@signature-params": ${params}`,
  ].join('\n');
  const signature = new Uint8Array(await crypto.subtle.sign('Ed25519', privateKey, new TextEncoder().encode(base)));
  return new Request(target, { method, headers: {
    'Signature-Agent': `sig="${signatureAgent}"`,
    'Signature-Input': `sig=${params}`,
    Signature: `sig=:${base64(signature)}:`,
  } });
}
