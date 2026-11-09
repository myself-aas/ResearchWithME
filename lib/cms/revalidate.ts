import { revalidatePath } from 'next/cache';

/** Invalidates the platform index and, when known, the article reader. */
export function revalidateArticle(slug?: string | null) {
  revalidatePath('/');
  revalidatePath('/sitemap.xml');
  if (slug) revalidatePath(`/post/${slug}`);
}
