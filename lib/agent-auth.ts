/**
 * Auth.md agent-registration discovery.
 *
 * The spec (github.com/workos/auth.md) composes three public documents:
 *
 *   1. `/auth.md`                                    — the prose walkthrough
 *   2. `/.well-known/oauth-protected-resource`       — RFC 9728, names the resource
 *   3. `<as>/.well-known/oauth-authorization-server` — RFC 8414, plus `agent_auth`
 *
 * Only hop 1 and 2 are ours to serve; hop 3 belongs to the authorization server,
 * which is Supabase, and reachable only when the owner enables Supabase Auth's
 * OAuth server. `lib/oauth-discovery.ts` mirrors that document and this module
 * adds the `agent_auth` block to it — but only on the path where the upstream
 * answered. No upstream, no block.
 *
 * ── Why the block can exist before the API accepts bearer tokens ─────────────
 *
 * `agent_auth` describes how an *agent* registers with the authorization server,
 * not how our APIs validate a token. Those are separate promises, and the spec
 * keeps them separate on purpose: the OAuth fields describe token endpoints and
 * grants; `agent_auth` describes registration, claim, and revocation.
 *
 * So the block is honest when, and only when, Supabase's OAuth server is enabled
 * with agent client registration turned on. Then an agent really can register
 * there and obtain a token. Whether `researchwith.me` accepts that token is a
 * different question, and the answer is currently no — which `/auth.md` and the
 * PRM both state plainly rather than implying otherwise.
 *
 * ── What is deliberately absent ─────────────────────────────────────────────
 *
 * `identity_assertion.assertion_types_supported` advertises ID-JAG
 * (`urn:ietf:params:oauth:token-type:id-jag`) and `verified_email`. Neither is
 * implemented by anyone in this chain: Supabase's dynamic client registration
 * takes a `redirect_uris`/`client_name` body, not a signed identity assertion.
 * Advertising them would invite an agent to mint an ID-JAG and POST it to
 * Supabase, which would reject it. The scanner treats them as optional and warns
 * when they are missing; a warning is the right outcome for a flow nobody built.
 */

const API_BEARER_SUPPORT = 'none';

export interface AgentAuthBlock {
  /** The walkthrough. Always ours; this is the document an agent reads first. */
  skill: string;
  /** Where an agent registers itself. Present only if upstream publishes one. */
  register_uri?: string;
  identity_types_supported: string[];
  identity_assertion?: {
    assertion_types_supported: string[];
    credential_types_supported: string[];
    claim_uri?: string;
  };
  anonymous?: {
    credential_types_supported: string[];
    claim_uri?: string;
  };
}

export interface AgentAuthInput {
  siteUrl: string;
  /**
   * The RFC 7591 registration endpoint from the upstream document. Supabase
   * publishes one only when its OAuth server is enabled *and* dynamic client
   * registration is turned on. Absent means "nobody can self-register here".
   */
  registrationEndpoint?: string;
}

/**
 * The `agent_auth` block, built from what the authorization server actually
 * publishes — never from what Auth.md's examples happen to look like.
 *
 * The distinction that matters: Auth.md's reference implementations serve an
 * Auth.md-specific `POST /agent/auth`. **Supabase does not.** Its registration
 * surface is RFC 7591 dynamic client registration at `registration_endpoint`.
 * Advertising `https://<project>/auth/v1/agent/auth` because the example says so
 * would hand every agent a URL that 404s on Supabase's host, and the failure
 * would look like our bug rather than "this server has no agent registration".
 *
 * So `register_uri` is copied from the upstream document, and a method is
 * advertised only when there is a mechanism behind it.
 */
export function agentAuthBlock({ siteUrl, registrationEndpoint }: AgentAuthInput): AgentAuthBlock {
  const site = siteUrl.replace(/\/+$/, '');
  const block: AgentAuthBlock = { skill: `${site}/auth.md`, identity_types_supported: [] };

  // No registration endpoint → no self-service method. The document still
  // exists (it is where an agent learns that), but it promises nothing.
  if (!registrationEndpoint) return block;

  block.register_uri = registrationEndpoint;
  // Anonymous self-registration is exactly what RFC 7591 at an open endpoint
  // provides: no prior identity, a client_id back. The user-mediated
  // `identity_assertion` method is not implemented by anyone in this chain
  // (Supabase verifies no ID-JAG), so it is not claimed.
  block.identity_types_supported = ['anonymous'];
  block.anonymous = { credential_types_supported: ['access_token'] };

  return block;
}

/**
 * RFC 9728 protected-resource metadata.
 *
 * ── authorization_servers must be the issuer, not this site ─────────────────
 *
 * RFC 9728 §3.3 tells a client to fetch
 * `<authorization_servers[0]>/.well-known/oauth-authorization-server` and then
 * check that the `issuer` it returns *is* the identifier it asked for; if not,
 * the metadata MUST be rejected.
 *
 * An earlier version advertised this origin, reasoning that our relay is where
 * the `agent_auth` block lives. That cannot work: the relay deliberately
 * reports Supabase's issuer, so the check fails and the document is discarded
 * before an agent reads the block the self-reference was meant to deliver.
 * Supabase serves RFC 8414 at the canonical path, so its issuer is also its
 * metadata location — the exact property the self-reference lacked. Advertise
 * the issuer.
 *
 * With no issuer known, the array is empty rather than filled with a guess. A
 * server that cannot answer the check sends every client down a path that must
 * fail; an empty array says only that authentication is not on offer, which the
 * rest of this document already states plainly.
 *
 * `bearer_methods_supported: ['header']` is true in the narrow sense that
 * matters: *if* a bearer token is ever accepted, it arrives in the
 * `Authorization` header. The `x-` field states the part a scanner cannot
 * infer — that no API here validates one today — so an agent does not read a
 * capability into the document that is not there.
 *
 * `scopes_supported` is empty for the same reason. Inventing `api.read` would
 * put a scope in front of an agent that no endpoint enforces.
 */
export function protectedResourceMetadata(
  siteUrl: string,
  options: { issuer?: string } = {},
): Response {
  const site = siteUrl.replace(/\/+$/, '');
  const body: Record<string, unknown> = {
    resource: site,
    authorization_servers: options.issuer ? [options.issuer] : [],
    scopes_supported: [] as string[],
    bearer_methods_supported: ['header'],
    resource_documentation: `${site}/auth.md`,
    'x-researchwithme-api-bearer-support': API_BEARER_SUPPORT,
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // The document carries an operator decision; a stale copy is a wrong copy.
      'Cache-Control': 'public, max-age=300',
    },
  });
}
