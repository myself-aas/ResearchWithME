import 'server-only';

import { getPublicCmsStore } from './store';
import type { CmsPost, CmsStore } from './types';

/**
 * Public reads are best-effort: a storage outage must degrade to the bundled
 * catalogue, never to a broken page. Failures are logged for the operator.
 */
export async function getPublishedCmsPosts(cms?: CmsStore): Promise<CmsPost[]> {
  try {
    const store = cms ?? (await getPublicCmsStore());
    const posts = await store.listPosts();
    return posts.filter((post) => post.status === 'published');
  } catch (error) {
    console.error('Could not load published CMS posts:', error);
    return [];
  }
}

export async function getCmsCommentCounts(cms?: CmsStore): Promise<Record<string, number>> {
  try {
    const store = cms ?? (await getPublicCmsStore());
    return await store.listCommentCounts();
  } catch (error) {
    console.error('Could not load CMS comment totals:', error);
    return {};
  }
}

export async function getPublishedCmsPostBySlug(
  slug: string,
  cms?: CmsStore,
): Promise<CmsPost | null> {
  if (!slug) return null;
  try {
    const store = cms ?? (await getPublicCmsStore());
    const post = await store.getPostBySlug(slug);
    return post?.status === 'published' ? post : null;
  } catch (error) {
    console.error('Could not load the CMS article:', error);
    return null;
  }
}

export async function getPublishedCmsPostById(
  id: string,
  cms?: CmsStore,
): Promise<CmsPost | null> {
  try {
    const store = cms ?? (await getPublicCmsStore());
    const post = await store.getPost(id);
    return post?.status === 'published' ? post : null;
  } catch (error) {
    console.error('Could not load the CMS article:', error);
    return null;
  }
}
