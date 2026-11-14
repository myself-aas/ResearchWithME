import { describe, expect, it } from 'vitest';
import { linkedIdentities, scholarlyProvider } from '@/lib/supabase/identities';

describe('linked scholarly identities', () => {
  it('recognises ORCID under the name Supabase stores for a custom provider', () => {
    // The flow is started as `custom:orcid` (lib/supabase/oauth.ts) and the
    // identity comes back under that name, not `orcid`.
    expect(scholarlyProvider('custom:orcid')).toBe('orcid');
    expect(scholarlyProvider('orcid')).toBe('orcid');
    expect(scholarlyProvider('github')).toBe('github');
    expect(scholarlyProvider('email')).toBeNull();
    expect(scholarlyProvider('google')).toBeNull();
    expect(scholarlyProvider(undefined)).toBeNull();
  });

  it('returns the ORCID iD as the handle, whatever shape the subject takes', () => {
    const iD = '0000-0002-1825-0097';
    for (const identity_data of [
      { sub: iD },
      { sub: `https://orcid.org/${iD}` },
      { provider_id: iD, full_name: 'Josiah Carberry' },
      { sub: iD, preferred_username: 'Josiah Carberry', user_name: 'jcarberry' },
    ]) {
      expect(linkedIdentities([{ provider: 'custom:orcid', identity_data }])).toEqual([
        { provider: 'orcid', handle: iD },
      ]);
    }
  });

  it('keeps the checksum X and reads GitHub usernames as before', () => {
    expect(linkedIdentities([{ provider: 'custom:orcid', identity_data: { sub: '0000-0002-1694-233x' } }])[0].handle).toBe(
      '0000-0002-1694-233X',
    );
    expect(
      linkedIdentities([
        { provider: 'email', identity_data: { sub: 'abc' } },
        { provider: 'github', identity_data: { user_name: 'octocat', sub: '583231' } },
      ]),
    ).toEqual([{ provider: 'github', handle: 'octocat' }]);
  });

  it('still reports a linked provider that sent no usable handle', () => {
    expect(linkedIdentities([{ provider: 'custom:orcid', identity_data: null }])).toEqual([
      { provider: 'orcid', handle: '' },
    ]);
    expect(linkedIdentities(null)).toEqual([]);
  });
});
