import { revalidatePath } from 'next/cache';

/** Invalidates the journal index and, when known, the article reader. */
export function revalidateArticle(slug?: string | null) {
  revalidatePath('/');
  revalidatePath('/sitemap.xml');
  if (slug) revalidatePath(`/post/${slug}`);
}

export function revalidateComments(postId?: string | null) {
  if (postId) revalidatePath(`/post/${postId}`);
}
