# Web Bot Auth signing

ResearchWithMe publishes a public Ed25519 JWKS at `/.well-known/http-message-signatures-directory` and signs outbound bot GET/HEAD requests using HTTP Message Signatures (RFC 9421, IETF WebBotAuth drafts). The private key is **not** in this repository: both runtimes read `WEB_BOT_AUTH_PRIVATE_JWK` from a runtime secret.

## Two signatures, not one

Swapping these is the most common reason a deployment that looks correct is silently rejected:

| | Covers | Tag |
| --- | --- | --- |
| **Directory response** | `("@authority";req)` | `http-message-signatures-directory` |
| **Bot request** | `("@method" "@authority" "@target-uri" "signature-agent")` | `web-bot-auth` |

The directory's own signature is the load-bearing part. Anyone can copy a public JWKS; only the holder of the private key can produce a valid signature over the authority serving it. Without that self-signature the key set proves nothing about who owns the host, which is precisely what Web Bot Auth exists to establish.

The request signature is what a receiving site — or Cloudflare's edge — verifies per request. It binds the method, authority and full target URI, so a signature cannot be replayed onto a redirect, a different path, or a POST.

## Cloudflare's parser is stricter than RFC 9421

Cloudflare rejects some constructs the RFC permits. All of these are enforced by `test/pages/web-bot-auth.test.ts`:

- **`Signature-Agent` is a quoted structured string** — `"https://researchwith.me/.well-known/http-message-signatures-directory"`. The dictionary form `sig="…"` is rejected, as is an unquoted URI.
- **`signature-agent` must be in the covered component list**, or verification fails.
- **`key` is unsupported** on header components. `sf`, `bs`, and `req` on header fields are unsupported too — `req` is supported only on `@authority`, in the directory signature.
- **`@query-params` and `@status`** are unsupported. Sign the whole query with `@target-uri`.
- **`keyid` must be the base64url JWK SHA-256 thumbprint** (RFC 8037 A.3), which is exactly what the directory publishes as `kid`.
- **`expires` must not be so short that it has expired in transit.** The signer uses five minutes.

## Provision a key

Generate a private JWK in a trusted environment. Do not paste it into chat, logs, CI, or any `NEXT_PUBLIC_*` variable:

```sh
node -e 'crypto.webcrypto.subtle.generateKey("Ed25519",true,["sign","verify"]).then(p=>crypto.webcrypto.subtle.exportKey("jwk",p.privateKey)).then(k=>process.stdout.write(JSON.stringify(k)))'
```

Then provision the JSON as a secret:

```sh
# Cloudflare Workers / Pages (production)
node -e '…' | npx wrangler secret put WEB_BOT_AUTH_PRIVATE_JWK

# Cloudflare Pages (dashboard): Settings → Environment variables →
# add WEB_BOT_AUTH_PRIVATE_JWK as an encrypted secret, then redeploy.

# Local development: untracked .env.local, JSON on one line.
```

Back the key up through your secret manager. Keep the old public key available through rotation — including the directory cache window (`max-age=300`) and the signature lifetime — because a verifier holding a cached directory must still be able to verify signatures made with the key it lists.

## Send a signed request

```sh
WEB_BOT_AUTH_PRIVATE_JWK='…' NEXT_PUBLIC_SITE_URL=https://researchwith.me \
  npx tsx scripts/web-bot-fetch.ts https://example.org/robots.txt
```

Redirects are not followed with the original signature: the signature is bound to the first target URI, so a redirect needs a fresh, separately-authorized signature. Supabase, email, and model-provider traffic is deliberately unsigned — those are not bot visits to another site. Do not expose this helper as an unauthenticated fetch proxy.

## Verify a deployment

```sh
curl -s https://researchwith.me/.well-known/http-message-signatures-directory -D- | head -20
```

A working deployment returns `200`, `content-type: application/http-message-signatures-directory+json`, and `signature`, `signature-input` headers alongside the JWKS.

`503` means no usable key was loaded. The body is deliberately generic; the reason is logged server-side as `Web Bot Auth directory unavailable: …`. The three causes, in order of likelihood:

1. `WEB_BOT_AUTH_PRIVATE_JWK` is not set in that environment (it is per-environment, and Pages requires a redeploy after adding it).
2. The secret is malformed — not a private Ed25519 JWK with both `x` and `d`.
3. The runtime cannot do Ed25519 in WebCrypto. Workers, Pages, and Node 22 all can; a runtime without `crypto.subtle` Ed25519 support logs a distinct message.

A `503` is the correct behaviour when the key is absent: publishing a placeholder key would be worse than publishing nothing, because verifiers cache it and then fail closed on every signature referencing it.

## Register with Cloudflare

Publishing the directory is the discoverable half and all that the readiness scanner checks. To be treated as a *verified* bot by Cloudflare's edge — rather than merely having a well-formed directory — the operator submits the key directory once: Cloudflare dashboard → **Manage Account → Configurations → Bot Submission Form**, Verification Method **Request Signature**, with the directory URL as the validation instructions. Cloudflare then accepts all valid Ed25519 keys in the directory. That registration is an account action, not a repository change.

## Status

- Directory and signing code: implemented, tested (7 assertions, including full signature-base reconstruction and verification of both signatures).
- Production: **returns 503 — no secret provisioned.** `checks.botAccessControl.webBotAuth` cannot pass until `WEB_BOT_AUTH_PRIVATE_JWK` is set and the site redeployed.
