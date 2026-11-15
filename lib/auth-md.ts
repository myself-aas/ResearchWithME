// Public agent-auth discovery. The discovery documents are real
// (/.well-known/oauth-protected-resource, /.well-known/oauth-authorization-server),
// but no ResearchWithMe API validates an OAuth access token, so this document
// must not imply that one does. The only bearer credential accepted here is an
// API key a signed-in person creates on the account page (lib/api/keys.ts). Registration happens at the authorization server, which is
// Supabase, using RFC 7591 dynamic client registration — NOT an Auth.md-specific
// `/agent/auth`, which Supabase does not serve. Do not advertise ID-JAG: nothing
// in this chain mints or verifies one.
export const AUTH_MD = `# ResearchWithMe auth.md

## Audience

This document is for software agents and developers integrating with the ResearchWithMe archive. It is the \`skill\` URL that \`agent_auth\` points back to: https://researchwith.me/auth.md

Public reading does not require an account. The Assistant API and the MCP tool \`ask_archive\` accept an API key that a signed-in person creates; no ResearchWithMe API accepts an OAuth access token. Agent registration is **not** handled by this service; it is handled, when an operator has enabled it, by the authorization server named in the discovery documents below.

## 1. Discover

1. Read the protected-resource metadata at [/.well-known/oauth-protected-resource](/.well-known/oauth-protected-resource). It names this resource, its authorization server, and states which bearer credential this host validates: its own API keys, not OAuth access tokens.
2. Read the authorization-server metadata at [/.well-known/oauth-authorization-server](/.well-known/oauth-authorization-server). It relays Supabase Auth's issuer verbatim and, when that OAuth server is reachable, carries an \`agent_auth\` block.
3. If \`agent_auth\` has no \`register_uri\`, there is nothing to register with on this deployment. Stop: the rest of this document is the whole story, and the public archive is readable without credentials.

## 2. Choose a method

| If \`agent_auth\` contains | Method | What happens |
| --- | --- | --- |
| \`register_uri\` and \`anonymous\` | Anonymous client registration | POST RFC 7591 client metadata, receive a \`client_id\` |
| no \`register_uri\` | Nothing | Do not attempt registration anywhere |

This deployment advertises **anonymous** registration only. It does **not** advertise ID-JAG (\`urn:ietf:params:oauth:token-type:id-jag\`) or a verified-email claim ceremony: no party in this chain mints or verifies an ID-JAG, and no claim endpoint is served.

## 3. Register

\`register_uri\` is Supabase's RFC 7591 dynamic client registration endpoint, on the authorization server's own host — **not** \`/agent/auth\`, which Supabase does not serve. Follow the value in the metadata; do not guess a path.

\`\`\`http
POST <register_uri>
Content-Type: application/json

{ "client_name": "your agent", "redirect_uris": ["https://your-agent.example/callback"] }
\`\`\`

The response carries a \`client_id\`. Registration creates an OAuth client, not an account and not a credential for this site.

## 4. Obtain a credential

Complete the OAuth 2.1 authorization-code flow with PKCE against the issuer and endpoints in the discovery document, with the user present. There is no headless path: an agent cannot mint a credential for a user without that user approving it.

## Registration and provisioning

Supported agent registration methods: **none on this host**.

- There is no \`POST /agent/auth\` on researchwith.me, and none on the authorization server either. Do not probe registration endpoints, send identity assertions, or attempt account creation against this service.
- To inquire about future agent access, contact the editorial team at [editor@researchwith.me](mailto:editor@researchwith.me) or visit [/contact](/contact). This is a human inquiry channel, not an automated registration or credential issuance endpoint.
- Human editorial accounts are provisioned by an administrator and sign in at [/login](/login). An approved writer can apply for publishing access at [/dashboard/access](/dashboard/access) after signing in. These flows do not register agents.

## Credential use

- Read the public archive through [the HTTP API](/api-docs), including GET /api/articles and GET /api/authors, without credentials.
- API keys are accepted on \`/api/v1/*\` and for the MCP tool \`ask_archive\`, sent as \`Authorization: Bearer rwm_...\`. A person with an account creates and revokes keys at [/dashboard/account](/dashboard/account); an agent cannot obtain one by itself. See [the Assistant API reference](/api-docs#assistant-api).
- A credential obtained from the authorization server is an OAuth access token for *that* server's resources. It is not accepted by researchwith.me: send it to Supabase's APIs, where row-level security decides what it may read. Do not send it to a ResearchWithMe route expecting agent authorization.
- The editorial studio uses a Supabase browser session cookie for approved human accounts. Do not send a Supabase publishable key as an agent credential; it does not grant account access.
- Do not attempt to register by probing write endpoints.

## Revocation

Revoke an OAuth client or its grants in the Supabase dashboard (Authentication → OAuth Apps). ResearchWithMe issues no agent credential through that flow. An API key is revoked by its owner at [/dashboard/account](/dashboard/account) and stops working at once.
`;

export function authMdResponse(method: string): Response {
  if (method !== 'GET' && method !== 'HEAD') {
    return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  return new Response(method === 'HEAD' ? null : AUTH_MD, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
