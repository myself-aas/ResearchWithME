import { LinkedInClient } from '@/lib/linkedin/client';
import { extractArticleForLinkedIn } from '@/lib/linkedin/article-extractor';
import { PostResult } from '@/lib/linkedin/client';

export interface BatchResult {
  posted: number;
  failed: number;
  results: Array<{ slug: string; result: PostResult }>;
}

const RATE_LIMIT_DELAY_MS = 1000; // 1 second between posts

export async function postArticleToLinkedIn(slug: string): Promise<PostResult> {
  const client = new LinkedInClient();
  const article = await extractArticleForLinkedIn(slug);
  
  if (!article) {
    return { success: false, error: `Article not found: ${slug}` };
  }

  return client.postArticle(article);
}

export async function batchPostArticles(slugs: string[]): Promise<BatchResult> {
  const client = new LinkedInClient();
  const results: BatchResult['results'] = [];
  let posted = 0;
  let failed = 0;

  for (const slug of slugs) {
    const article = await extractArticleForLinkedIn(slug);
    
    if (!article) {
      results.push({ slug, result: { success: false, error: 'Article not found' } });
      failed++;
      continue;
    }

    const result = await client.postArticle(article);
    results.push({ slug, result });

    if (result.success) {
      posted++;
      // Update article status in CMS if available
      await updateArticleLinkedInStatus(slug, 'posted', result.postUrn);
    } else {
      failed++;
      await updateArticleLinkedInStatus(slug, 'failed', undefined, result.error);
    }

    // Rate limiting delay
    if (slugs.indexOf(slug) < slugs.length - 1) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
    }
  }

  return { posted, failed, results };
}

export async function checkAndPostNewArticles(): Promise<BatchResult> {
  // This would integrate with CMS to find articles with linkedin_post_status = 'pending'
  // For now, return empty - implement based on CMS schema
  const { getPublishedArticles } = await import('@/lib/linkedin/article-extractor');
  const articles = await getPublishedArticles();
  
  // Filter to only those not yet posted (would need CMS integration)
  const pendingSlugs = articles
    .filter(a => a.slug) // Add status check when CMS supports it
    .map(a => a.slug!);
  
  if (pendingSlugs.length === 0) {
    return { posted: 0, failed: 0, results: [] };
  }

  return batchPostArticles(pendingSlugs);
}

async function updateArticleLinkedInStatus(
  slug: string, 
  status: 'pending' | 'posted' | 'failed', 
  postUrn?: string, 
  error?: string
): Promise<void> {
  // TODO: Integrate with CMS when article schema supports linkedin_post_status
  // For JSON-based articles, this is a no-op
  console.log(`[LinkedIn] Article ${slug} status: ${status}`, { postUrn, error });
}