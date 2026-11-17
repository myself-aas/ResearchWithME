import { LinkedInClient, PostResult } from '@/lib/linkedin/client';
import {
  extractArticleForLinkedIn,
  getPublishedEditorialArticles,
} from '@/lib/linkedin/article-extractor';
import { withRetry } from '@/lib/linkedin/retry';
import { createEventLogger } from '@/lib/linkedin/monitoring';
import { getSupabasePublicClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export interface BatchResult {
  posted: number;
  failed: number;
  skipped: number;
  results: Array<{ slug: string; success: boolean; skipped?: boolean; postUrn?: string; error?: string }>;
}

type RpcClient = {
  rpc: (
    fn: string,
    params?: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

export interface AutomationOptions {
  /** Optional authenticated Supabase client (e.g., Editor-in-Chief request). */
  client?: RpcClient;
  /** Optional override for LINKEDIN_BRIDGE_SECRET. */
  bridgeSecret?: string | null;
  /** Skip deduplication check when an Editor-in-Chief explicitly forces a repost. */
  force?: boolean;
}

function resolveBridgeSecret(override?: string | null): string | null {
  if (override !== undefined) return override;
  const value = (process.env.LINKEDIN_BRIDGE_SECRET ?? '').trim();
  return value || null;
}

function getRpcClient(options?: AutomationOptions): RpcClient | null {
  if (options?.client) return options.client;
  if (!isSupabaseConfigured) return null;
  try {
    return getSupabasePublicClient() as unknown as RpcClient;
  } catch {
    return null;
  }
}

export async function listPostedLinkedInSlugs(options?: AutomationOptions): Promise<Set<string>> {
  const client = getRpcClient(options);
  if (!client) return new Set();

  try {
    const { data, error } = await client.rpc('linkedin_list_posted_slugs', {
      p_secret: resolveBridgeSecret(options?.bridgeSecret),
    });
    if (error || !Array.isArray(data)) return new Set();
    return new Set(
      (data as Array<{ post_slug?: string }>)
        .map((row) => row.post_slug)
        .filter((slug): slug is string => typeof slug === 'string' && slug.length > 0),
    );
  } catch {
    return new Set();
  }
}

export async function recordLinkedInPostStatus(
  slug: string,
  status: 'posted' | 'failed',
  postUrn?: string,
  error?: string,
  options?: AutomationOptions,
): Promise<void> {
  const client = getRpcClient(options);
  if (!client) return;

  try {
    await client.rpc('linkedin_record_post_status', {
      p_slug: slug,
      p_status: status,
      p_post_urn: postUrn ?? null,
      p_error: error ?? null,
      p_secret: resolveBridgeSecret(options?.bridgeSecret),
    });
  } catch (err) {
    console.error(`[LinkedIn] Failed to record status for ${slug}:`, err);
  }
}

export async function postArticleToLinkedIn(
  slug: string,
  options?: AutomationOptions,
): Promise<PostResult & { skipped?: boolean }> {
  const article = await extractArticleForLinkedIn(slug, { requireEditorial: true });
  if (!article) {
    return {
      success: false,
      error: `Article not found or not an editorial post: ${slug}`,
    };
  }

  if (!options?.force) {
    const postedSlugs = await listPostedLinkedInSlugs(options);
    if (postedSlugs.has(slug)) {
      return { success: true, skipped: true };
    }
  }

  const client = new LinkedInClient({
    client: options?.client,
    bridgeSecret: options?.bridgeSecret,
  });

  const result = await withRetry(() => client.postArticle(article), {
    maxAttempts: 3,
    baseDelayMs: 2000,
  });

  await recordLinkedInPostStatus(
    slug,
    result.success ? 'posted' : 'failed',
    result.postUrn,
    result.error,
    options,
  );

  return result;
}

export async function batchPostArticles(
  slugs: string[],
  options?: AutomationOptions,
): Promise<BatchResult> {
  const results: BatchResult['results'] = [];
  let posted = 0;
  let failed = 0;
  let skipped = 0;

  const logger = createEventLogger({
    client: options?.client,
    bridgeSecret: options?.bridgeSecret,
  });
  await logger.logBatchStart(slugs.length);

  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];

    try {
      const result = await postArticleToLinkedIn(slug, options);
      results.push({ slug, ...result });

      if (result.skipped) {
        skipped++;
      } else if (result.success) {
        posted++;
      } else {
        failed++;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.push({ slug, success: false, error: errorMessage });
      failed++;
    }

    // Rate limit: 1 second between posts
    if (i < slugs.length - 1) {
      await delay(1000);
    }
  }

  await logger.logBatchComplete(posted, failed);
  return { posted, failed, skipped, results };
}

export async function handleArticlePublished(
  slug: string,
  options?: AutomationOptions,
): Promise<PostResult & { skipped?: boolean }> {
  return postArticleToLinkedIn(slug, options);
}

/**
 * Checks all published editorial posts and publishes only those not yet
 * recorded as `posted` in `public.linkedin_posts`.
 */
export async function checkAndPostNewArticles(options?: AutomationOptions): Promise<BatchResult> {
  const editorials = await getPublishedEditorialArticles();
  const postedSlugs = await listPostedLinkedInSlugs(options);
  const pendingSlugs = editorials
    .map((article) => article.slug)
    .filter((slug) => !postedSlugs.has(slug));

  if (pendingSlugs.length === 0) {
    return { posted: 0, failed: 0, skipped: editorials.length, results: [] };
  }

  const batch = await batchPostArticles(pendingSlugs, options);
  return {
    ...batch,
    skipped: batch.skipped + (editorials.length - pendingSlugs.length),
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
