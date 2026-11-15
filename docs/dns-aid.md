# DNS for AI Discovery (DNS-AID)

`researchwith.me` uses Cloudflare DNS. The DNS-AID records below point at the site's existing HTTPS agent endpoints; they are **DNS records, not HTTP routes**, so deploying this repository does not publish them. `scripts/dns-aid-cloudflare.mjs` is an idempotent, dry-run-by-default publisher for these three ServiceMode SVCB records:

```dns
_index._agents.researchwith.me. 3600 IN SVCB 1 researchwith.me. mandatory="alpn,port" alpn="h2" port="443"
_a2a._agents.researchwith.me.   3600 IN SVCB 1 researchwith.me. mandatory="alpn,port" alpn="h2" port="443" key65409="agent-card.json"
_mcp._agents.researchwith.me.   3600 IN SVCB 1 researchwith.me. mandatory="alpn,port" alpn="h2" port="443" key65409="mcp/server-card.json"
```

`h2` describes the actual TLS HTTP/2 transport offered by Cloudflare. The experimental well-known-path SvcParamKey uses its numeric `key65409` name (not an unregistered mnemonic); an agent constructs `https://researchwith.me/.well-known/<value>` from it. These paths resolve to the A2A card and MCP card. The target has no underscore and uses the site's existing certificate. `mandatory=alpn,port` tells clients that cannot parse either connection parameter not to use the record. Do **not** set `alpn="a2a"` unless the TLS endpoint really negotiates that ALPN identifier.

## Publish with Cloudflare

1. Deploy and verify the A2A and MCP cards at `https://researchwith.me/.well-known/agent-card.json` and `https://researchwith.me/.well-known/mcp/server-card.json` first. The DNS target must be reachable.
2. In Cloudflare DNS for `researchwith.me`, enable DNSSEC. **Ensure the matching DS record is installed at the domain registrar**; Cloudflare showing `active` alone does not prove the parent delegates a signed zone. Changing DNSSEC on a domain with an incorrect/stale DS can break resolution. If already active, leave it alone.
3. Use a zone-scoped Cloudflare token with Zone Read, DNS Read/Edit (and DNSSEC Edit only if you explicitly intend to enable DNSSEC via API). Never paste a token into this document or commit it. This sandbox has no Cloudflare DNS credentials; the script cannot publish from here.
4. Review the dry run, then apply from an environment with the token:

```sh
node scripts/dns-aid-cloudflare.mjs
CLOUDFLARE_API_TOKEN="$TOKEN_FROM_SECRET_STORE" node scripts/dns-aid-cloudflare.mjs --apply
# Only if DNSSEC was reviewed and must be enabled (still install/check parent DS):
CLOUDFLARE_API_TOKEN="$TOKEN_FROM_SECRET_STORE" node scripts/dns-aid-cloudflare.mjs --apply --enable-dnssec
```

The publisher checks that the exact Cloudflare zone is active, checks DNSSEC **before** writing, upserts only these three SVCB names, and refuses ambiguous same-name SVCB or CNAME records. It will not silently enable DNSSEC. Its DNSSEC mode is opt-in and still requires registrar DS verification. The script uses Cloudflare's structured SVCB `data: { priority, target, value }` API shape.

## Verified state (2026-11-13)

Checked over DNS-over-HTTPS against public resolvers, not inferred from this repository:

| Check | Result |
| --- | --- |
| `_index._agents.researchwith.me` SVCB | **NODATA** — not published |
| `_a2a._agents.researchwith.me` SVCB | **NODATA** — not published |
| `_mcp._agents.researchwith.me` SVCB | **NODATA** — not published |
| `researchwith.me` DS at the parent | **present** (`2371 13 2 217060…D4D2`) |
| Resolver `AD` flag on zone queries | **true** — the zone is signed and the chain validates |

So DNSSEC — the part that cannot be fixed from here and is the riskiest to change — is
already correct and needs no action. The records themselves have never been created.
`checks.discoverability.dnsAid` cannot pass until they are, and no test or deploy in
this repository publishes them.

Both target endpoints are live and were confirmed before writing this:
`https://researchwith.me/.well-known/agent-card.json` and
`https://researchwith.me/.well-known/mcp/server-card.json`. The A2A interface in the
card advertises `https://researchwith.me/api/a2a`.

This sandbox holds no Cloudflare credentials, so publishing requires an operator with a
zone-scoped token (step 3 below).

## Verify

```sh
node scripts/verify-dns-aid.mjs
```

The verifier queries Cloudflare DNS-over-HTTPS for each SVCB and the parent DS; it requires the AD (authenticated data) flag on every response. Once authoritative DNS has propagated, run the scanner and check `checks.discoverability.dnsAid.status`. A dry run or successful repository test is **not** evidence that the records or DNSSEC are live.
