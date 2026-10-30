import 'server-only';

import { getPublicCmsStore } from './store';
import type { CmsPost } from './types';

/**
 * Public reads are best-effort: a storage outage must degrade to the bundled
 * catalogue, never to a broken page. Failures are logged for the operator.
 *
 * After a failure the reads sit out for a short cooldown. A single failing
 * request already costs several seconds; repeating it on every render would
 * make an outage look like a slow site.
 */
const RETRY_COOLDOWN_MS = 30_000;
let lastFailureAt = 0;

function coolingDown() {
  return Date.now() - lastFailureAt < RETRY_COOLDOWN_MS;
}

function noteFailure() {
  lastFailureAt = Date.now();
}
export async function getPublishedCmsPosts(): Promise<CmsPost[]> {
  if (coolingDown()) return [];
  try {
    const store = await getPublicCmsStore();
    const posts = await store.listPosts();
    return posts.filter((post) => post.status === 'published');
  } catch (error) {
    console.error('Could not load published CMS posts:', error);
    noteFailure();
    return [];
  }
}

export async function getCmsCommentCounts(): Promise<Record<string, number>> {
  if (coolingDown()) return {};
  try {
    const store = await getPublicCmsStore();
    return await store.listCommentCounts();
  } catch (error) {
    console.error('Could not load CMS comment totals:', error);
    noteFailure();
    return {};
  }
}

export async function getPublishedCmsPostBySlug(slug: string): Promise<CmsPost | null> {
  if (!slug || coolingDown()) return null;
  try {
    const store = await getPublicCmsStore();
    const post = await store.getPostBySlug(slug);
    return post?.status === 'published' ? post : null;
  } catch (error) {
    console.error('Could not load the CMS article:', error);
    noteFailure();
    return null;
  }
}

export async function getPublishedCmsPostById(id: string): Promise<CmsPost | null> {
  if (coolingDown()) return null;
  try {
    const store = await getPublicCmsStore();
    const post = await store.getPost(id);
    return post?.status === 'published' ? post : null;
  } catch (error) {
    console.error('Could not load the CMS article:', error);
    noteFailure();
    return null;
  }
}
