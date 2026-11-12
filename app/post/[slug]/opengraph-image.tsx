import { cache } from 'react';
import { brandOgImage } from '@/lib/og/brand-image';
import { getCachedArticleCatalogue } from '@/lib/cms/catalogue';

export const alt = 'ResearchWithMe article';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const catalogue = cache(getCachedArticleCatalogue);

export default async function PostOgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let title = 'Research review';
  try {
    const articles = await catalogue();
    const article = articles.find((a) => a.slug === slug || a.id === slug);
    if (article) title = article.title;
  } catch {
    /* CMS unavailable — generic branded card */
  }
  return brandOgImage(title, 'Open-access research review · ResearchWithMe');
}
