import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createLocalCmsStore } from '@/lib/cms/local-store';
import { CmsConflictError, CmsNotFoundError } from '@/lib/cms/errors';
import type { CmsPostInput, CmsStore } from '@/lib/cms/types';

let directory: string;
let store: CmsStore;

const input: CmsPostInput = {
  title: 'A reproducible review of paged attention',
  slug: 'reproducible-review-paged-attention',
  content: 'The cache is split into fixed-size blocks. '.repeat(8),
  status: 'draft',
  subtitle: 'A systems teardown',
  summary: 'A detailed review of memory fragmentation in high-concurrency model serving.',
  category: 'Research Reviews',
  format: 'Paper Review',
  authorId: 'maya-lin',
  authorName: 'Maya Lin',
  coverImage: null,
  tags: ['CUDA', 'Inference'],
  keyTakeaways: ['Block allocation removed the waste.'],
  readTime: '2 min read',
  featured: false,
};

beforeAll(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'rwm-cms-'));
  store = createLocalCmsStore({ dataDir: directory });
});

afterAll(async () => {
  await fs.rm(directory, { recursive: true, force: true });
});

describe('local CMS store', () => {
  it('starts empty', async () => {
    expect(await store.listPosts()).toEqual([]);
  });

  it('creates a draft without a publication date', async () => {
    const created = await store.createPost(input);
    expect(created.id).toBe('1');
    expect(created.status).toBe('draft');
    expect(created.publishedAt).toBeNull();
    expect(created.likes).toBe(0);
    expect(await store.getPost('1')).toMatchObject({ id: '1', title: input.title });
    expect(await store.getPostBySlug(input.slug)).toMatchObject({ id: '1' });
  });

  it('refuses a duplicate slug', async () => {
    await expect(store.createPost(input)).rejects.toBeInstanceOf(CmsConflictError);
  });

  it('publishes, timestamps, and reverts the same article', async () => {
    const published = await store.updatePost('1', { ...input, status: 'published' });
    expect(published.status).toBe('published');
    expect(published.publishedAt).toBeTruthy();

    const reverted = await store.updatePost('1', { ...input, status: 'draft' });
    expect(reverted.status).toBe('draft');
    expect(reverted.publishedAt).toBeNull();
  });

  it('increments likes atomically', async () => {
    const first = await store.incrementLikes('1');
    const second = await store.incrementLikes('1');
    expect(first).toBe(1);
    expect(second).toBe(2);
  });

  it('stores comments, joins the post title, and deletes one', async () => {
    const comment = await store.createComment('1', {
      authorName: 'Dana Reed',
      authorRole: 'Systems engineer',
      content: 'We reproduced this on two nodes.',
    });
    expect(comment.postTitle).toBe(input.title);

    const list = await store.listCommentsForPost('1');
    expect(list).toHaveLength(1);
    expect(await store.getComment(comment.id)).toMatchObject({ id: comment.id });
    expect(await store.listComments()).toHaveLength(1);
    expect(await store.listCommentCounts()).toEqual({ '1': 1 });

    await store.deleteComment(comment.id);
    expect(await store.listCommentsForPost('1')).toEqual([]);
    expect(await store.listCommentCounts()).toEqual({});
    await expect(store.deleteComment(comment.id)).rejects.toBeInstanceOf(CmsNotFoundError);
  });

  it('cascades comments when the article is deleted', async () => {
    await store.createComment('1', {
      authorName: 'A reader',
      authorRole: 'Reader',
      content: 'A note that should disappear with the article.',
    });

    await store.deletePost('1');
    expect(await store.getPost('1')).toBeNull();
    expect(await store.listComments()).toEqual([]);
    await expect(store.updatePost('1', input)).rejects.toBeInstanceOf(CmsNotFoundError);
  });
});
