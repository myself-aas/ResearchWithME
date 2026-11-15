/**
 * IETF Web Bot Auth — HTTP Message Signatures (RFC 9421) with Ed25519.
 *
 * Two distinct signatures, and swapping them is the most common reason a
 * verifier silently rejects an otherwise valid deployment:
 *
 *   directory response  tag="http-message-signatures-directory", over ("@authority";req)
 *   bot request         tag="web-bot-auth",                     over ("@authority" "signature-agent")
 *
 * The first proves the host serving the keys also holds the private half, so a
 * third party cannot mirror the key set and claim the identity. The second is
 * the one a receiving site — or Cloudflare's edge — verifies per request.
 *
 * Cloudflare parses both fields as structured fields and rejects some of what
 * RFC 9421 permits. The constraints that bite:
 *
 *   Signature-Agent  a quoted structured *string* ("https://…"), never the
 *                    dictionary form sig="https://…", never http:
 *   covered list     `signature-agent` must be included, or verification fails
 *   parameters       `key` is unsupported and fails; so are `sf`, `bs`, `req`
 *                    on header fields, `@query-params`, and `@status`
 *
 * A signer that emits headers a verifier rejects is worse than no signer: it
 * claims an identity it cannot prove. The tests assert against a real
 * verification of the reconstructed signature base, not the header strings.
 */
export const WEB_BOT_DIRECTORY = '/.well-known/http-message-signatures-directory';
export const DIRECTORY_MEDIA_TYPE = 'application/http-message-signatures-directory+json';

/** Tag for the self-signature that binds the key set to this host. */
const DIRECTORY_TAG = 'http-message-signatures-directory';
/** Tag for ordinary outbound bot requests. */
const REQUEST_TAG = 'web-bot-auth';

/** Five minutes: long enough to arrive, short enough to blunt replay. */
const LIFETIME_SECONDS = 300;

type SigningKey = { kty: 'OKP'; crv: 'Ed25519'; x: string; d: string };

function decodeKey(value: string): SigningKey {
  const key: unknown = JSON.parse(value);
  if (!key || typeof key !== 'object') throw new Error('Signing key is missing.');
  const jwk = key as Record<string, unknown>;
  if (
    jwk.kty !== 'OKP' ||
    jwk.crv !== 'Ed25519' ||
    typeof jwk.x !== 'string' ||
    !/^[A-Za-z0-9_-]{43}$/.test(jwk.x) ||
    typeof jwk.d !== 'string' ||
    !/^[A-Za-z0-9_-]{43}$/.test(jwk.d)
  ) {
    throw new Error('Expected a private Ed25519 JWK with x and d.');
  }
  return jwk as SigningKey;
}

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function now(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * RFC 8037 appendix A.3 thumbprint: SHA-256 over the canonical
 * representation of the public key. This is the only `kid` Cloudflare accepts
 * ("MUST be a base64url JWK SHA-256 Thumbprint … for ed25519").
 */
async function thumbprint(x: string): Promise<string> {
  const canonical = new TextEncoder().encode(JSON.stringify({ crv: 'Ed25519', kty: 'OKP', x }));
  return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', canonical)));
}

async function loadKey(privateJwk: string) {
  const { x, d } = decodeKey(privateJwk);
  const publicJwk = { kty: 'OKP', crv: 'Ed25519', x } as const;
  const kid = await thumbprint(x);

  const privateKey = await crypto.subtle.importKey('jwk', { ...publicJwk, d }, 'Ed25519', false, ['sign']);
  const verificationKey = await crypto.subtle.importKey('jwk', publicJwk, 'Ed25519', false, ['verify']);

  // Reject a mismatched pair before publishing a directory that cannot verify
  // the signatures this signer produces.
  const probe = new TextEncoder().encode('web-bot-auth-key-check');
  const signature = await crypto.subtle.sign('Ed25519', privateKey, probe);
  if (!(await crypto.subtle.verify('Ed25519', verificationKey, signature, probe))) {
    throw new Error('Signing key pair does not match.');
  }

  return { publicJwk, kid, privateKey };
}

/** Build `("@a" "@b";req);created=…;keyid="…";alg="ed25519";tag="…"`. */
function signatureInput(components: string, kid: string, tag: string, created: number): string {
  return `(${components});created=${created};expires=${created + LIFETIME_SECONDS};keyid="${kid}";alg="ed25519";tag="${tag}"`;
}

async function sign(privateKey: CryptoKey, base: string): Promise<string> {
  return base64(new Uint8Array(await crypto.subtle.sign('Ed25519', privateKey, new TextEncoder().encode(base))));
}

/**
 * The public key directory. Returns 503 rather than a placeholder key when no
 * signing key is provisioned: a directory that advertises a key nobody holds is
 * worse than an absent one, because verifiers cache it and fail closed on every
 * signature that references it.
 *
 * `authority` is the host the response is served from. With it, the response is
 * self-signed as Web Bot Auth requires; without it the key set is still served,
 * but unsigned — an unsigned directory is still usable for verification, it
 * just cannot be used as proof of key ownership.
 */
export async function webBotDirectoryResponse(
  privateJwk: string | undefined,
  method: string,
  authority?: string,
): Promise<Response> {
  const allow = { Allow: 'GET, HEAD' };
  if (method !== 'GET' && method !== 'HEAD') return new Response(null, { status: 405, headers: allow });

  try {
    const { publicJwk, kid, privateKey } = await loadKey(privateJwk ?? '');
    const body = JSON.stringify({ keys: [{ ...publicJwk, kid, use: 'sig' }] });

    const headers: Record<string, string> = {
      'Content-Type': DIRECTORY_MEDIA_TYPE,
      'Cache-Control': 'public, max-age=300',
    };

    if (authority) {
      const created = now();
      // Exactly ("@authority";req), which is what the Web Bot Auth drafts and
      // Cloudflare specify for this signature. The `req` flag makes the
      // component refer to the request rather than a response, and is the one
      // place Cloudflare does support it.
      const params = signatureInput('"@authority";req', kid, DIRECTORY_TAG, created);
      const signatureBase = [`"@authority";req: ${authority}`, `"@signature-params": ${params}`].join('\n');

      headers['Signature-Input'] = `sig1=${params}`;
      headers.Signature = `sig1=:${await sign(privateKey, signatureBase)}:`;
    }

    return new Response(method === 'HEAD' ? null : body, { headers });
  } catch (error) {
    // The body stays generic — it is public, and must never leak the private
    // `d`. The *reason* goes to the server log instead: without it, a missing
    // secret and a runtime that cannot do Ed25519 look identical from outside,
    // which is exactly the ambiguity that makes this endpoint hard to operate.
    console.error(
      'Web Bot Auth directory unavailable:',
      error instanceof Error ? error.message : String(error),
    );
    return new Response('Web Bot Auth signing key is not configured.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
}

/**
 * Sign an outbound bot request so the receiving site can verify it.
 *
 * Only https GET/HEAD without a body: a signature covers the method and target
 * URI it was created for, so it cannot be reused for a redirect, a POST, or a
 * different path. Deliberately does not sign Supabase, email, or model-provider
 * traffic — those are not bot visits to another website.
 */
export async function signedBotRequest(
  url: string,
  privateJwk: string,
  siteUrl: string,
  method: 'GET' | 'HEAD' = 'GET',
): Promise<Request> {
  const target = new URL(url);
  const site = new URL(siteUrl);
  if (
    target.protocol !== 'https:' ||
    site.protocol !== 'https:' ||
    target.username ||
    target.password ||
    target.hash
  ) {
    throw new Error('Web Bot Auth requires HTTPS URLs without userinfo or fragments.');
  }

  const { kid, privateKey } = await loadKey(privateJwk);
  const signatureAgent = `${site.origin}${WEB_BOT_DIRECTORY}`;
  const created = now();

  // The `signature-agent` component must be covered, or Cloudflare rejects the
  // message. No `key=` parameter: Cloudflare does not support it.
  const components = '"@method" "@authority" "@target-uri" "signature-agent"';
  const params = signatureInput(components, kid, REQUEST_TAG, created);

  const signatureBase = [
    `"@method": ${method}`,
    `"@authority": ${target.host}`,
    `"@target-uri": ${target.href}`,
    `"signature-agent": "${signatureAgent}"`,
    `"@signature-params": ${params}`,
  ].join('\n');

  return new Request(target, {
    method,
    headers: {
      // Structured string, quoted. The dictionary form `sig="…"` is rejected,
      // as is an unquoted URI.
      'Signature-Agent': `"${signatureAgent}"`,
      'Signature-Input': `sig1=${params}`,
      Signature: `sig1=:${await sign(privateKey, signatureBase)}:`,
    },
  });
}
