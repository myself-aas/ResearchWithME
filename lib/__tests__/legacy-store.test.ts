import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createLocalLegacyStore } from '@/lib/legacy/local-store';
import { createSupabaseLegacyStore } from '@/lib/legacy/supabase-store';
import type { LegacyStore } from '@/lib/legacy/types';
import { getArticleCatalogue, getFeedArticles } from '@/lib/cms/catalogue';
import { createSupabaseLegacyFixture } from '@/test/fixtures/legacy';
import type { CmsPost, CmsStore } from '@/lib/cms/types';

describe('supabase legacy store', () => {
  it('keeps seed IDs and reports failed durable writes', async () => {
    const fixture = createSupabaseLegacyFixture();
    const store = createSupabaseLegacyStore(fixture.client, fixture.seeds);

    expect((await store.getArticles()).find((article) => article.id === 'post-1')).toMatchObject({
      likes: 342,
      commentsCount: 28,
    });
    expect(await store.incrementLikes('post-1')).toBe(343);

    fixture.failWrites();
    await expect(
      store.addComment('post-1', { authorName: 'Reader', authorRole: '', content: 'Useful notes.' }),
    ).rejects.toThrow();
  });

  it('rejects unknown article ids instead of returning a false counter', async () => {
    const fixture = createSupabaseLegacyFixture();
    const store = createSupabaseLegacyStore(fixture.client, fixture.seeds);

    await expect(store.incrementLikes('post-999')).rejects.toThrow();
    await expect(
      store.addComment('post-999', { authorName: 'Reader', content: 'Useful notes.' }),
    ).rejects.toThrow();
  });

  it('deduplicates seeded comments between durable rows and the seed JSON', async () => {
    const fixture = createSupabaseLegacyFixture();
    const store = createSupabaseLegacyStore(fixture.client, fixture.seeds);

    const comments = await store.getComments('post-1');
    const ids = comments.map((comment) => comment.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(['comm-1', 'comm-2']));

    const inserted = await store.addComment('post-1', {
      authorName: 'Reader Example',
      authorRole: 'Engineer',
      content: 'Useful notes.',
    });
    const after = await store.getComments('post-1');
    expect(after.map((comment) => comment.id)).toContain(inserted.id);
    // The fresh durable row appears exactly once and carries the inserted text.
    expect(after.filter((comment) => comment.id === inserted.id)).toHaveLength(1);
    expect(after.find((comment) => comment.id === inserted.id)).toMatchObject({
      authorName: 'Reader Example',
      text: 'Useful notes.',
    });

    const counter = fixture.readCounter('post-1');
    expect(counter?.comments_count).toBe(29);
  });

  it('resolves articles by old slug and by id', async () => {
    const fixture = createSupabaseLegacyFixture();
    const store = createSupabaseLegacyStore(fixture.client, fixture.seeds);

    const bySlug = await store.findArticle('inside-vllm-and-paged-attention');
    const byId = await store.findArticle('post-1');
    expect(bySlug?.id).toBe('post-1');
    expect(byId?.slug).toBe('inside-vllm-and-paged-attention');
    expect(await store.findArticle('missing')).toBeUndefined();
  });

  it('lets a later instance read an earlier instance\'s successful write', async () => {
    const fixture = createSupabaseLegacyFixture();
    const writer = createSupabaseLegacyStore(fixture.client, fixture.seeds);
    const reader = createSupabaseLegacyStore(fixture.client, fixture.seeds);

    expect(await writer.incrementLikes('post-2')).toBe(520);
    expect((await reader.getArticles()).find((article) => article.id === 'post-2')?.likes).toBe(520);
  });
});

describe('local legacy store', () => {
  let directory: string;

  beforeAll(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'rwm-legacy-'));
    // Start from a seed-like articles.json carrying the checked-in counters.
    await fs.writeFile(
      path.join(directory, 'articles.json'),
      JSON.stringify(fixtureArticles(), null, 2),
      'utf8',
    );
  });

  afterAll(async () => {
    await fs.rm(directory, { recursive: true, force: true });
  });

  function fixtureArticles() {
    return [
      {
        id: 'post-1',
        slug: 'inside-vllm-and-paged-attention',
        title: 'Inside vLLM and PagedAttention',
        subtitle: 'subtitle',
        summary: 'summary',
        category: 'Research Reviews',
        format: 'Paper Review',
        author: { id: 'maya-lin', name: 'Maya Lin', role: 'Research Editor', avatar: '' },
        content: 'content',
        tags: [],
        keyTakeaways: [],
        readTime: '10 min read',
        likes: 342,
        commentsCount: 28,
        publishedAt: '2026-01-01',
      },
    ];
  }

  it('persists likes and comments across store instances sharing a data dir', async () => {
    const first = createLocalLegacyStore({ dataDir: directory });
    expect(await first.incrementLikes('post-1')).toBe(343);

    const second = createLocalLegacyStore({ dataDir: directory });
    expect((await second.findArticle('post-1'))?.likes).toBe(343);

    const comment = await second.addComment('post-1', {
      authorName: 'Reader Example',
      content: 'Useful notes.',
    });
    const reread = createLocalLegacyStore({ dataDir: directory });
    const comments = await reread.getComments('post-1');
    expect(comments.map((entry) => entry.id)).toContain(comment.id);
    expect((await reread.findArticle('post-1'))?.commentsCount).toBe(29);
  });

  it('fails loudly when the data directory cannot be created', async () => {
    const blocker = path.join(directory, 'blocked');
    await fs.writeFile(blocker, 'not a directory', 'utf8');
    const store = createLocalLegacyStore({ dataDir: path.join(blocker, 'nested') });

    await expect(
      store.addComment('post-1', { authorName: 'Reader', content: 'Useful notes.' }),
    ).rejects.toThrow();
  });
});

function stubCmsStore(posts: CmsPost[], counts: Record<string, number> = {}): CmsStore {
  const notImplemented = () => Promise.reject(new Error('not implemented'));
  return {
    kind: 'local',
    listPosts: () => Promise.resolve(posts),
    getPost: () => Promise.resolve(null),
    getPostBySlug: () => Promise.resolve(null),
    createPost: notImplemented,
    updatePost: notImplemented,
    deletePost: notImplemented,
    incrementLikes: notImplemented,
    listComments: () => Promise.resolve([]),
    listCommentsForPost: () => Promise.resolve([]),
    listCommentCounts: () => Promise.resolve(counts),
    getComment: () => Promise.resolve(null),
    createComment: notImplemented,
    deleteComment: notImplemented,
  };
}

function publishedPost(overrides: Partial<CmsPost>): CmsPost {
  return {
    id: 'cms-1',
    slug: 'inside-vllm-and-paged-attention',
    title: 'CMS-first title',
    subtitle: '',
    summary: 'summary',
    category: 'Research Reviews',
    format: 'Paper Review',
    content: 'content',
    status: 'published',
    authorId: 'maya-lin',
    authorName: 'Maya Lin',
    coverImage: null,
    tags: [],
    keyTakeaways: [],
    readTime: '9 min read',
    featured: false,
    artifact: null,
    likes: 7,
    publishedAt: '2026-02-01',
    insertedAt: '2026-02-01',
    updatedAt: '2026-02-01',
    ...overrides,
  };
}

describe('getArticleCatalogue bridge', () => {
  it('keeps published-CMS precedence on slug collisions and merges legacy counters', async () => {
    const fixture = createSupabaseLegacyFixture();
    const legacy = createSupabaseLegacyStore(fixture.client, fixture.seeds);
    const cms = stubCmsStore([publishedPost({})], { 'cms-1': 4 });

    const catalogue = await getArticleCatalogue(legacy, cms);
    const collided = catalogue.find((article) => article.slug === 'inside-vllm-and-paged-attention');
    expect(collided?.title).toBe('CMS-first title');
    expect(collided?.likes).toBe(7);
    expect(collided?.commentsCount).toBe(4);

    const legacyOnly = catalogue.find((article) => article.id === 'post-2');
    expect(legacyOnly).toBeDefined();
  });

  it('starts the legacy read while the CMS read is still pending', async () => {
    let releaseCms!: () => void;
    const cmsPending = new Promise<void>((resolve) => { releaseCms = resolve; });
    const cms = stubCmsStore([]);
    cms.listPosts = async () => { await cmsPending; return []; };
    const fixture = createSupabaseLegacyFixture();
    const legacy = createSupabaseLegacyStore(fixture.client, fixture.seeds);
    const readArticles = legacy.getArticles;
    let legacyStarted = false;
    legacy.getArticles = () => { legacyStarted = true; return readArticles(); };

    const result = getArticleCatalogue(legacy, cms);
    await Promise.resolve();
    const startedBeforeCmsCompleted = legacyStarted;
    releaseCms();
    await result;
    expect(startedBeforeCmsCompleted).toBe(true);
  });

  it('shows durable legacy counters instead of stale bundled counters', async () => {
    const fixture = createSupabaseLegacyFixture();
    const legacy = createSupabaseLegacyStore(fixture.client, fixture.seeds);
    await legacy.incrementLikes('post-1');

    const catalogue = await getArticleCatalogue(legacy, stubCmsStore([]));
    expect(catalogue.find((article) => article.id === 'post-1')?.likes).toBe(343);
  });

  it('degrades to the bundled seed posts when the legacy store fails', async () => {
    const failingLegacy: LegacyStore = {
      kind: 'supabase',
      getArticles: () => Promise.reject(new Error('storage down')),
      findArticle: () => Promise.reject(new Error('storage down')),
      incrementLikes: () => Promise.reject(new Error('storage down')),
      getComments: () => Promise.reject(new Error('storage down')),
      addComment: () => Promise.reject(new Error('storage down')),
    };
    const cms = stubCmsStore([]);
    const catalogue = await getArticleCatalogue(failingLegacy, cms);
    // The bundled seed corpus keeps the pages renderable.
    expect(catalogue.length).toBeGreaterThanOrEqual(8);
  });
});

describe('getFeedArticles (server-rendered feed)', () => {
  it('returns the whole catalogue as metadata-only cards, so the feed is never empty in server HTML', async () => {
    const fixture = createSupabaseLegacyFixture();
    const legacy = createSupabaseLegacyStore(fixture.client, fixture.seeds);
    const cms = stubCmsStore([publishedPost({})], { 'cms-1': 4 });

    const [catalogue, feed] = await Promise.all([getArticleCatalogue(legacy, cms), getFeedArticles(legacy, cms)]);
    expect(feed.length).toBeGreaterThan(0);
    expect(feed.map((article) => article.slug)).toEqual(catalogue.map((article) => article.slug));
    for (const article of feed) {
      expect(article.content).toEqual([]);
      expect(article).not.toHaveProperty('bodyMarkdown');
      expect(article.title).toBeTruthy();
    }
  });
});
