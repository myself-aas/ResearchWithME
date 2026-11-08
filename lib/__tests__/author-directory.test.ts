import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The distinction these tests exist to protect:
 *
 *   - a list read may degrade to empty (an empty directory is a valid state)
 *   - a single lookup must NOT, because /author/[id] turns null into notFound()
 *
 * If getPublishedAuthor swallowed a failed fetch, a three-second Supabase blip
 * would serve a 404 for an author who exists, and crawlers read 404 as "gone".
 * The build cannot catch this -- /author/[id] prerenders zero paths, so
 * getAuthorArchive never runs at build time.
 */

const state = vi.hoisted(() => ({
  result: { data: null as unknown, error: null as unknown },
}));

vi.mock('@/lib/supabase/config', () => ({ isSupabaseConfigured: true }));

vi.mock('@/lib/supabase/server', () => ({
  getSupabasePublicClient: () => {
    // queryProfiles awaits the builder directly, so it has to be thenable.
    const chain: Record<string, unknown> = {};
    chain.select = () => chain;
    chain.eq = () => chain;
    chain.order = () => chain;
    chain.then = (
      onFulfilled: (value: unknown) => unknown,
      onRejected: (reason: unknown) => unknown,
    ) => Promise.resolve(state.result).then(onFulfilled, onRejected);
    return { from: () => chain };
  },
}));

vi.mock('@/lib/cms/catalogue', () => ({ getArticleCatalogue: async () => [] }));

const PUBLISHED = {
  user_id: 'b7e2c1a4-0000-4000-8000-000000000001',
  slug: 'maya-lin',
  display_name: 'Maya Lin',
  bio: 'Studies inference systems.',
  role: 'Systems reviewer',
  domain: 'Inference',
  institution: 'Example Lab',
  avatar_url: 'ML',
  orcid: '0000-0000-0000-0001',
  github: '',
  website: '',
  scholar: '',
  created_at: '2026-01-01T00:00:00.000Z',
  published: true,
};

/** Fresh module each time: the exports are wrapped in React's cache. */
async function loadDirectory() {
  vi.resetModules();
  return import('@/lib/author-directory');
}

function reply(data: unknown, error: unknown = null) {
  state.result = { data, error };
}

beforeEach(() => {
  reply(null);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('getPublishedAuthor', () => {
  it('resolves a published profile', async () => {
    reply([PUBLISHED]);
    const { getPublishedAuthor } = await loadDirectory();
    const author = await getPublishedAuthor('maya-lin');
    expect(author?.id).toBe('maya-lin');
    expect(author?.name).toBe('Maya Lin');
  });

  it('returns null when the profile genuinely does not exist', async () => {
    reply([]);
    const { getPublishedAuthor } = await loadDirectory();
    expect(await getPublishedAuthor('nobody')).toBeNull();
  });

  it('throws on a failed fetch rather than reporting the author missing', async () => {
    // This is the regression guard: collapsing this into null would 404 a
    // real author during a transient outage.
    reply(null, new Error('connection reset'));
    const { getPublishedAuthor } = await loadDirectory();
    await expect(getPublishedAuthor('maya-lin')).rejects.toThrow('connection reset');
  });
});

describe('listPublishedAuthors', () => {
  it('lists published profiles', async () => {
    reply([PUBLISHED]);
    const { listPublishedAuthors } = await loadDirectory();
    const authors = await listPublishedAuthors();
    expect(authors).toHaveLength(1);
    expect(authors[0].id).toBe('maya-lin');
  });

  it('degrades to an empty directory on a failed fetch', async () => {
    // The opposite contract from the lookup, and intentional: an empty
    // directory is a legitimate state, so an outage should not break the page.
    reply(null, new Error('connection reset'));
    const { listPublishedAuthors } = await loadDirectory();
    await expect(listPublishedAuthors()).resolves.toEqual([]);
  });
});

describe('getAuthorArchive', () => {
  it('propagates a failed fetch instead of producing a 404', async () => {
    reply(null, new Error('connection reset'));
    const { getAuthorArchive } = await loadDirectory();
    await expect(getAuthorArchive('maya-lin')).rejects.toThrow('connection reset');
  });

  it('returns null only for a genuine miss', async () => {
    reply([]);
    const { getAuthorArchive } = await loadDirectory();
    await expect(getAuthorArchive('nobody')).resolves.toBeNull();
  });
});
