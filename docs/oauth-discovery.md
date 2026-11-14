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

The protected-resource document advertises `bearer_methods_supported: ["header"]` and an empty `scopes_supported`, plus `x-researchwithme-api-bearer-support: none`. No ResearchWithMe route reads an `Authorization` header, so a scope list would name permissions no endpoint enforces. `authorization_servers` points at this origin because that is where the document carrying `agent_auth` is served; `x-researchwithme-issuer-relay` records that the issuer inside it is Supabase's, which strict RFC 8414 issuer-location checks will not match.

## Caveat on the alias

This site-root endpoint is an alias for *Supabase's* issuer metadata, not the issuer's canonical RFC 8414 location. The `issuer` remains Supabase's actual issuer, not `https://researchwith.me`; consumers validating RFC 8414 issuer-location matching should use the canonical Supabase URL. ResearchWithMe's APIs currently use browser session cookies for editorial access, not OAuth bearer tokens. The mirror alone **does not enable agents to authenticate to these APIs**. Before claiming agent OAuth support, implement bearer validation, resource/audience and scope checks on protected APIs, then add the scopes to the protected-resource document. `/auth.md` describes the currently supported public and human flows.

To check a deployed environment, request `GET /.well-known/oauth-authorization-server`, compare its issuer and endpoints with the upstream Supabase document, and check the upstream OAuth server configuration. The scanner at `https://isitagentready.com/api/scan` can only be run after deployment; this repository change does not establish a production `oauthDiscovery` pass.
