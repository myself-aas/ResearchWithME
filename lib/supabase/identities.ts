/**
 * Reads the scholarly identities (GitHub, ORCID) linked to a Supabase account.
 *
 * Kept free of React and of the browser client so it can be tested directly:
 * a mistake here does not throw, it just makes a connected account look
 * unconnected, which is the hardest kind of failure to notice.
 */

export interface LinkedIdentity {
  provider: 'github' | 'orcid';
  /** GitHub username, or the ORCID iD. Empty when the provider omits it. */
  handle: string;
}

/** The minimum of `User['identities'][number]` this module reads. */
export interface RawIdentity {
  provider?: string | null;
  identity_data?: Record<string, unknown> | null;
}

const ORCID_ID = /\b(\d{4}-\d{4}-\d{4}-\d{3}[\dX])\b/i;

/**
 * Maps the provider name Supabase stores on an identity to ours.
 *
 * ORCID is a *custom* OIDC provider. The app starts the flow as
 * `custom:orcid`, and Supabase records the identity under that same prefixed
 * name — not under `orcid`. Comparing against the bare name is what made a
 * successfully linked ORCID account invisible to the application form.
 */
export function scholarlyProvider(raw: string | null | undefined): LinkedIdentity['provider'] | null {
  const name = String(raw ?? '').trim().toLowerCase().replace(/^custom:/, '');
  return name === 'github' || name === 'orcid' ? name : null;
}

function firstString(values: unknown[]): string {
  const hit = values.find((value): value is string => typeof value === 'string' && value.trim().length > 0);
  return (hit ?? '').trim();
}

/**
 * GitHub returns the username under `user_name` or `preferred_username`.
 * ORCID returns the iD as the OIDC subject; depending on the attribute mapping
 * it can also arrive as a full `https://orcid.org/…` URL or under
 * `provider_id`, so the iD is extracted by shape before any name-like claim is
 * considered. An application cites this value, and a person's display name is
 * not an identifier.
 */
function handleFor(provider: LinkedIdentity['provider'], data: Record<string, unknown>): string {
  if (provider === 'orcid') {
    for (const key of ['sub', 'provider_id', 'orcid', 'id', 'preferred_username', 'user_name']) {
      const value = data[key];
      const match = typeof value === 'string' ? ORCID_ID.exec(value) : null;
      if (match) return match[1].toUpperCase();
    }
  }
  return firstString([data.user_name, data.preferred_username, data.sub, data.full_name]).slice(0, 160);
}

export function linkedIdentities(identities: readonly RawIdentity[] | null | undefined): LinkedIdentity[] {
  const found: LinkedIdentity[] = [];
  for (const identity of identities ?? []) {
    const provider = scholarlyProvider(identity.provider);
    if (!provider) continue;
    found.push({ provider, handle: handleFor(provider, identity.identity_data ?? {}) });
  }
  return found;
}
