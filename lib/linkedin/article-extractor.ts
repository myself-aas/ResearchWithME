import { getCachedArticleCatalogue } from '@/lib/cms/catalogue';
import { ArticleData } from '@/lib/linkedin/client';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://researchwith.me';

export async function extractArticleForLinkedIn(slug: string): Promise<ArticleData | null> {
  const articles = await getCachedArticleCatalogue();
  const article = articles.find(a => a.slug === slug || a.id === slug);
  
  if (!article) return null;

  // Only process published articles (CMS drafts have different handling)
  // For JSON-based articles, all are considered published
  
  const coverImage = article.coverImage && article.coverImage.trim() !== '' && !article.coverImage.startsWith('data:')
    ? `${SITE_URL}${article.coverImage}`
    : undefined;

  return {
    title: article.title,
    summary: article.summary,
    url: `${SITE_URL}/post/${article.slug}`,
    coverImage,
    authorName: article.author.name,
    category: article.category,
    tags: article.tags,
    doi: `10.5555/rwm.${article.id}`,
  };
}

export async function getPublishedArticles(): Promise<Array<{ slug: string; title: string; dateISO?: string }>> {
  const articles = await getCachedArticleCatalogue();
  return articles
    .filter(a => a.slug && a.title)
    .map(a => ({ slug: a.slug, title: a.title, dateISO: a.dateISO }))
    .sort((a, b) => (b.dateISO || '').localeCompare(a.dateISO || ''));
}