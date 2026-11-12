import { revalidatePath, revalidateTag } from 'next/cache';

/** Invalidates the platform index and, when known, the article reader. */
export function revalidateArticle(slug?: string | null) {
  // Cached catalogue reads (feed pages); tag value mirrors CATALOGUE_TAG in
  // ./catalogue, which is server-only and cannot be imported here by tests.
  revalidateTag('catalogue');
  revalidatePath('/');
  revalidatePath('/sitemap.xml');
  if (slug) revalidatePath(`/post/${slug}`);
}
