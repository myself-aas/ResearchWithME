# Web Bot Auth signing

ResearchWithMe can publish a public Ed25519 JWKS at `/.well-known/http-message-signatures-directory` and sign outbound bot GET/HEAD requests using HTTP Message Signatures (RFC 9421 and the IETF Web Bot Auth draft). The signing key is **not** stored in this repository. Both the Next.js Worker and Cloudflare Pages runtime read `WEB_BOT_AUTH_PRIVATE_JWK` from a runtime secret. The directory derives its public JWK and RFC 7638 thumbprint `kid` from that private JWK; it returns 503 until a valid key is configured, rather than pretending that bot signing is active. It never serializes the private `d` value.

## Provision a key

Generate an Ed25519 JWK in a trusted environment and provision its JSON as a secret. For a Cloudflare Worker, the following command streams the key directly into Wrangler (do not paste the JSON into chat, logs, Git, or a build-time `NEXT_PUBLIC_*` variable):

```sh
node -e 'crypto.webcrypto.subtle.generateKey("Ed25519",true,["sign","verify"]).then(p=>crypto.webcrypto.subtle.exportKey("jwk",p.privateKey)).then(k=>process.stdout.write(JSON.stringify(k)))' | npx wrangler secret put WEB_BOT_AUTH_PRIVATE_JWK
```

For Cloudflare Pages, configure `WEB_BOT_AUTH_PRIVATE_JWK` as an encrypted Pages Functions secret. For local Next.js development use an untracked `.env.local` with the JSON on a single line. Back up the private key through your organization's secret-management process if continuity across redeployments matters. Keep the old public key available throughout rotation (including the cache and signature-expiry window); the current endpoint publishes one configured key, so use a maintenance window for rotation or extend the directory to publish both public keys before switching signing keys. Never commit the private key.

## Send a signed request

The operator-invoked bot fetch script signs the actual outbound request using the runtime secret:

```sh
WEB_BOT_AUTH_PRIVATE_JWK='...' NEXT_PUBLIC_SITE_URL=https://researchwith.me \
  npx tsx scripts/web-bot-fetch.ts https://example.org/robots.txt
```

The script disables automatic redirect following: a redirected URL requires a new signature and authorization to visit. It only accepts HTTPS GET/HEAD without request bodies. The `signedBotRequest` helper constructs `Signature-Agent`, `Signature-Input`, and `Signature` headers, covering method, authority, target URI (including query), and the signature-agent directory URL; signatures expire after five minutes. It does not sign the unrelated Supabase, email, or model provider traffic, since those are not bot visits to external websites. Do not expose this helper as an unauthenticated HTTP fetch proxy.

After configuring the secret and deploying, GET the directory over HTTPS and verify its `keys[0].kid` matches the `keyid` on a signed bot request. Only then run the production scanner and check `checks.botAccessControl.webBotAuth.status`. A repository change alone cannot establish a scanner pass or a public JWKS without provisioning the secret.
