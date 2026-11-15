# OAuth discovery mirror

`/.well-known/oauth-authorization-server` (Next.js and the optional Cloudflare Pages runtime) mirrors the configured Supabase Auth project's OAuth **authorization-server** discovery document. It reads the public `NEXT_PUBLIC_SUPABASE_URL` setting and fetches `/auth/v1/.well-known/oauth-authorization-server` from that project. It returns JSON only when Supabase returns a successful document containing an issuer at that project's `/auth/v1`, same-project authorization, token, and JWKS URLs, and code/authorization-code support. Otherwise it returns 503, without inventing an issuer or endpoints. The public Supabase URL is build-time configuration in both runtimes.

**Enable Supabase Auth's OAuth server** in the Supabase project before expecting this endpoint to respond with metadata. Supabase's OIDC discovery alone is not proof that the OAuth server is enabled. Confirm the upstream authorization and token endpoints actually work for an approved OAuth client; enabling dynamic client registration is a separate configuration choice. No OAuth client secrets belong in this repository.

When the upstream document is valid, the response is relayed field-for-field with one addition: an Auth.md `agent_auth` block (see below). When it is not, the endpoint answers `503` and the block is absent — a registration advertisement beside a dead authorization server would send agents to a door that does not open.

## Auth.md agent registration

`/auth.md` follows the Auth.md convention (github.com/workos/auth.md), and the discovery chain is:

| Hop | Path | Owner |
| --- | --- | --- |
| Walkthrough | `/auth.md` | this repository (`lib/auth-md.ts`) |
| Protected resource (RFC 9728) | `/.well-known/oauth-protected-resource` | this repository (`lib/agent-auth.ts`) |
| Authorization server (RFC 8414 + `agent_auth`) | `/.well-known/oauth-authorization-server` | relayed from Supabase |

**`agent_auth.register_uri` is copied from the upstream document, never constructed.** Auth.md's reference implementations serve an Auth.md-specific `POST /agent/auth`; Supabase does not. Supabase's registration surface is RFC 7591 dynamic client registration, published as `registration_endpoint` (`/auth/v1/oauth/register`) and available only when the OAuth server is enabled *and* dynamic client registration is switched on. Hard-coding `/agent/auth` would have handed every agent a 404 on Supabase's host.

If upstream publishes no `registration_endpoint`, the block keeps its `skill` pointer and advertises **no** identity types. `identity_assertion` and ID-JAG are never advertised: nothing in this chain mints or verifies an ID-JAG, so claiming one would invite an assertion that would be rejected.

The protected-resource document advertises `bearer_methods_supported: ["header"]` and an empty `scopes_supported`, plus `x-researchwithme-api-bearer-support: none`. No ResearchWithMe route reads an `Authorization` header, so a scope list would name permissions no endpoint enforces. `authorization_servers` names **Supabase's issuer** (`https://<project>.supabase.co/auth/v1`), resolved at request time from the authorization server's own document — never assumed, and never this origin.

An earlier version advertised this origin, reasoning that the relay is where `agent_auth` lives. That cannot work. RFC 9728 §3.3 has the client fetch `<authorization_servers[0]>/.well-known/oauth-authorization-server` and then require the returned `issuer` to equal the identifier it asked for; our relay deliberately reports Supabase's issuer, so the check fails and the whole document — `agent_auth` included — is discarded before an agent reads it. Supabase serves RFC 8414 at the canonical path, so its issuer *is* its metadata location, which is the property the self-reference lacked.

`discoverIssuer` and the relay share one validator (`validateDiscoveryDocument`), so the PRM can never name a server the relay would refuse, and a PRM whose `authorization_servers` is not exactly the relayed `issuer` would fail the client check.

With no reachable or valid authorization server, `authorization_servers` is `[]`. An empty array says only that authentication is not on offer — the same thing the rest of the document states. Naming a host that cannot answer the RFC 8414 check would send every client down a path that must fail.

## Both well-known addresses

`/.well-known/oauth-authorization-server` (RFC 8414) and `/.well-known/openid-configuration`
(OIDC Discovery) answer from one implementation with identical content. The scanner
accepts either, and agents commonly try OIDC first; two code paths would eventually
disagree.

## Why the relay has a snapshot fallback

Discovery metadata changes rarely — a new scope, a new endpoint. The round-trip that
fetches it can fail at any moment: DNS inside the Worker, an egress policy, a cold
start, a timeout. When it did, this endpoint answered `503`, which tells a scanning
agent "this service has no OAuth" — a false statement about a working configuration.
That is what kept `checks.discovery.oauthDiscovery` failing while the upstream
document was demonstrably healthy and publicly reachable.

`lib/oauth-metadata.ts` holds a captured copy of this project's document. Live data
wins whenever the fetch succeeds; the snapshot answers when it does not, and the
response says which one you got:

| Header | Meaning |
| --- | --- |
| `x-researchwithme-source: upstream` | Relayed live, `max-age=300` |
| `x-researchwithme-source: snapshot` | Captured copy, `max-age=60`, plus `x-researchwithme-metadata-captured` |

The snapshot is bound to one origin. If `NEXT_PUBLIC_SUPABASE_URL` points at a
different project, there is no fallback and the endpoint stays `503` — a snapshot is
evidence about one issuer, not a template for any issuer. Refresh it by fetching the
live document and replacing the object; the tests assert the six required fields, so
a malformed refresh fails CI rather than production.

## Caveat on the alias

This site-root endpoint is an alias for *Supabase's* issuer metadata, not the issuer's canonical RFC 8414 location. The `issuer` remains Supabase's actual issuer, not `https://researchwith.me`; consumers validating RFC 8414 issuer-location matching should use the canonical Supabase URL. ResearchWithMe's APIs currently use browser session cookies for editorial access, not OAuth bearer tokens. The mirror alone **does not enable agents to authenticate to these APIs**. Before claiming agent OAuth support, implement bearer validation, resource/audience and scope checks on protected APIs, then add the scopes to the protected-resource document. `/auth.md` describes the currently supported public and human flows.

To check a deployed environment, request `GET /.well-known/oauth-authorization-server`, compare its issuer and endpoints with the upstream Supabase document, and check the upstream OAuth server configuration. The scanner at `https://isitagentready.com/api/scan` can only be run after deployment; this repository change does not establish a production `oauthDiscovery` pass.

## The relay's fetch must suit the Workers runtime

workerd accepts only `redirect: 'follow'` and `redirect: 'manual'`. The relay used `redirect: 'error'`, which the edge rejects outright — so the fetch threw before any request was sent, the snapshot fallback answered `200`, and the relayed document was a week-old capture on every request. Nothing in the response said the upstream had never been reached: `x-researchwithme-source: snapshot` looks exactly like a transient outage.

It is now `manual`, and a 3xx is treated as a failed round-trip because a redirect means the document is not served from the origin that was validated. `test/pages/oauth-resilience.test.ts` asserts the fetch configuration directly, since this failure mode is invisible in Node — where `redirect: 'error'` is perfectly legal — and only appears in workerd.

## One loader, two consumers

`loadDiscovery` does the round-trip and the validation once. The relay needs the document; the protected-resource metadata needs only the issuer. Fetching separately would let them disagree about whether the authorization server is usable, so a PRM could name a server the relay then refuses.

