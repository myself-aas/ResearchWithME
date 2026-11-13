// Public agent-auth discovery. Do not advertise an OAuth issuer, registration
// protocol, token type, or protected-resource metadata until this service
// actually implements and validates them. Supabase's browser login is not an
// OAuth authorization server for ResearchWithMe API clients.
export const AUTH_MD = `# ResearchWithMe auth.md

## Audience

This document is for software agents and developers integrating with the ResearchWithMe archive. Public reading does not require an account. Agent account registration, delegated authorization, and machine credentials are **not currently supported**.

## Registration and provisioning

- Supported agent registration methods: none. There is no POST /agent/auth or automated agent provisioning endpoint; do not send identity assertions or registration requests to this service.
- To inquire about future agent access, contact the editorial team at [editor@researchwith.me](mailto:editor@researchwith.me) or visit [/contact](/contact). This is a human inquiry channel, not an automated registration or credential issuance endpoint.
- Human editorial accounts are provisioned by an administrator and sign in at [/login](/login). An approved writer can apply for publishing access at [/dashboard/access](/dashboard/access) after signing in. These flows do not register agents.

## Credential use

- Read the public archive through [the HTTP API](/api-docs), including GET /api/articles and GET /api/authors, without credentials.
- The editorial studio uses a Supabase browser session cookie for approved human accounts. Do not send a Supabase publishable key as an agent credential; it does not grant account access. Do not send bearer tokens to the ResearchWithMe API expecting agent authorization.
- [OAuth authorization-server discovery](/.well-known/oauth-authorization-server), when available, mirrors the configured Supabase Auth issuer; it does not mean ResearchWithMe APIs accept OAuth bearer tokens or offer agent registration. No ResearchWithMe OAuth protected-resource metadata is published. Do not attempt to register by probing write endpoints.
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
