import { getCachedArticleCatalogue } from '@/lib/cms/catalogue';
import { BlogPost } from '@/lib/blog-data';
import { ArticleData } from '@/lib/linkedin/client';

const DEFAULT_SITE_URL = 'https://researchwith.me';

function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '');
}

/**
 * LinkedIn automation is strictly scoped to Editorial posts published by the
 * Editor-in-Chief (`publicationType === 'editorial'`).
 */
export function isEditorialEligible(article: Pick<BlogPost, 'publicationType'>): boolean {
  return article.publicationType === 'editorial';
}

/**
 * Normalizes an article cover image URL for LinkedIn sharing:
 * - Preserves absolute `https://` / `http://` URLs (e.g. Supabase Storage) without double-prefixing.
 * - Prefixes root-relative paths (`/images/...`) with `SITE_URL`.
 * - Ignores `data:` URIs and blank strings.
 */
export function normalizeCoverImageUrl(coverImage?: string | null): string | undefined {
  if (!coverImage) return undefined;
  const trimmed = coverImage.trim();
  if (!trimmed || trimmed.startsWith('data:')) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const siteUrl = getSiteUrl();
  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${siteUrl}${normalizedPath}`;
}

export interface ExtractArticleOptions {
  /**
   * By default only `publicationType === 'editorial'` posts are extracted for
   * LinkedIn automation. Pass `requireEditorial: false` only for inspection.
   */
  requireEditorial?: boolean;
}

export async function extractArticleForLinkedIn(
  slug: string,
  options: ExtractArticleOptions = {},
): Promise<ArticleData | null> {
  const { requireEditorial = true } = options;
  const articles = await getCachedArticleCatalogue();
  const article = articles.find((a) => a.slug === slug);

  if (!article) return null;
  if (requireEditorial && !isEditorialEligible(article)) return null;

  return mapBlogPostToArticleData(article);
}

export function mapBlogPostToArticleData(article: BlogPost): ArticleData {
  const siteUrl = getSiteUrl();
  const coverImage = normalizeCoverImageUrl(article.coverImage);
  const doi = article.reviewedArtifact?.type === 'paper'
    ? article.reviewedArtifact.identifier
    : undefined;

  return {
    title: article.title,
    summary: article.summary || article.subtitle || '',
    url: `${siteUrl}/post/${article.slug}`,
    coverImage,
    authorName: article.author?.name || 'ResearchWithMe',
    category: article.category || 'Research Reviews',
    tags: article.tags || [],
    doi,
    publicationType: article.publicationType ?? 'review',
  };
}

/** Returns published editorial posts eligible for LinkedIn automation. */
export async function getPublishedEditorialArticles(): Promise<BlogPost[]> {
  const articles = await getCachedArticleCatalogue();
  return articles.filter(isEditorialEligible);
}

/**
 * Returns published articles eligible for LinkedIn automation (editorial posts only).
 */
export async function getPublishedArticles(): Promise<BlogPost[]> {
  return getPublishedEditorialArticles();
}
