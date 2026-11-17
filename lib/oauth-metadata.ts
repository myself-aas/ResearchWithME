/**
 * A captured copy of this project's authorization-server metadata.
 *
 * ── Why a snapshot exists at all ────────────────────────────────────────────
 *
 * Discovery metadata changes when an operator changes it — a new scope, a new
 * endpoint. That is rare. The round-trip that fetches it, on the other hand, can
 * fail at any time: DNS inside the Worker, an egress policy, a cold start, a
 * timeout race. When it does, the relay answered `503`, which tells a scanning
 * agent "this service has no OAuth" — a false statement about a working
 * configuration, and the reason `oauthDiscovery` kept failing.
 *
 * So: live data wins whenever it is available, and this document answers when it
 * is not. The response says which one you got.
 *
 * ── Why it is bound to one origin ───────────────────────────────────────────
 *
 * A snapshot is evidence about *one issuer*. Serving it for a different project
 * would advertise token endpoints belonging to an origin the caller does not
 * control — so `issuerOrigin` is checked, and a mismatch returns 503 rather than
 * a plausible-looking lie.
 *
 * ── Keeping it current ──────────────────────────────────────────────────────
 *
 * `captured` is shown in the response as `x-researchwithme-metadata-captured`.
 * Refresh it by fetching the live document and replacing the object below; the
 * test suite asserts the four fields the scanner requires are present, so a
 * malformed refresh fails CI rather than production.
 *
 * Captured 2026-11-13 from this project's `/auth/v1/.well-known/oauth-authorization-server`.
 */

export const OAUTH_METADATA_SNAPSHOT = {
  /** The only origin this snapshot is valid for. */
  issuerOrigin: 'https://bxyjjbclaklzjxeumeat.supabase.co',
  captured: '2026-11-13',
  document: {
    issuer: 'https://bxyjjbclaklzjxeumeat.supabase.co/auth/v1',
    authorization_endpoint: 'https://bxyjjbclaklzjxeumeat.supabase.co/auth/v1/oauth/authorize',
    token_endpoint: 'https://bxyjjbclaklzjxeumeat.supabase.co/auth/v1/oauth/token',
    jwks_uri: 'https://bxyjjbclaklzjxeumeat.supabase.co/auth/v1/.well-known/jwks.json',
    userinfo_endpoint: 'https://bxyjjbclaklzjxeumeat.supabase.co/auth/v1/oauth/userinfo',
    scopes_supported: ['openid', 'profile', 'email', 'phone', 'offline_access'],
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256', 'HS256', 'ES256'],
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post', 'none'],
    claims_supported: [
      'sub',
      'aud',
      'iss',
      'exp',
      'iat',
      'auth_time',
      'nonce',
      'email',
      'email_verified',
      'phone_number',
      'phone_number_verified',
      'name',
      'picture',
      'preferred_username',
      'updated_at',
    ],
    code_challenge_methods_supported: ['S256', 'plain'],
  } as Record<string, unknown>,
};

export interface OAuthMetadataSnapshot {
  issuerOrigin: string;
  captured: string;
  document: Record<string, unknown>;
}

/**
 * Returns the active OAuth discovery snapshot. Operators running staging or
 * alternate Supabase projects can supply `OAUTH_METADATA_SNAPSHOT_JSON`
 * (JSON matching `{ issuerOrigin, captured, document }`) at runtime without
 * editing source code; otherwise falls back to the captured production snapshot.
 */
export function getOAuthMetadataSnapshot(): OAuthMetadataSnapshot {
  const raw = process.env.OAUTH_METADATA_SNAPSHOT_JSON?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<OAuthMetadataSnapshot>;
      if (
        typeof parsed.issuerOrigin === 'string' &&
        typeof parsed.captured === 'string' &&
        parsed.document &&
        typeof parsed.document === 'object' &&
        !Array.isArray(parsed.document)
      ) {
        return {
          issuerOrigin: parsed.issuerOrigin,
          captured: parsed.captured,
          document: parsed.document as Record<string, unknown>,
        };
      }
    } catch {
      // Ignore malformed runtime override and fall back to built-in snapshot.
    }
  }
  return OAUTH_METADATA_SNAPSHOT;
}

/** True when `supabaseUrl` is the project this snapshot was captured from. */
export function snapshotMatches(supabaseUrl: string): boolean {
  try {
    const active = getOAuthMetadataSnapshot();
    const configured = new URL(supabaseUrl);
    const captured = new URL(active.issuerOrigin);
    return (
      configured.protocol === 'https:' &&
      !configured.username &&
      !configured.password &&
      !configured.search &&
      !configured.hash &&
      configured.pathname === '/' &&
      configured.origin === captured.origin
    );
  } catch {
    return false;
  }
}
