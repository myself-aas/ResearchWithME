import type { SupabaseClient } from '@supabase/supabase-js';
import type { BlogPost } from '@/lib/blog-data';
import { DEFAULT_LEGACY_SEEDS } from './seeds';
import type { CommentRecord, LegacyCommentInput, LegacySeeds, LegacyStore } from './types';

interface DurableCounter {
  likes: number;
  commentsCount: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToRecord(row: any): CommentRecord {
  return {
    id: String(row.id),
    postId: String(row.post_id),
    authorName: String(row.author_name),
    authorRole: row.author_role == null ? '' : String(row.author_role),
    avatar: row.avatar == null ? '' : String(row.avatar),
    timestamp: row.timestamp == null ? 'Just now' : String(row.timestamp),
    text: String(row.text),
  };
}

/**
 * Supabase adapter for the durable legacy interactions (Task 3 schema).
 *
 * Seeds come from the checked-in JSON; durable likes/counts/comments (seeded
 * into the tables by the migration with the same ids) overlay them without
 * changing ids or payload shapes. Durable rows win; seed rows missing from
 * the tables (e.g. pre-migration databases) are merged in de-duplicated by id.
 * Writes go exclusively through the fixed-search-path SECURITY DEFINER RPCs;
 * any failure throws.
 *
 * NOTE: PostgREST composite returns may arrive either as a single object or
 * as a one-element array depending on client version, so the RPC payload is
 * normalised defensively. Verify against staging when a hosted database is
 * available.
 */
export function createSupabaseLegacyStore(
  client: SupabaseClient,
  seeds: LegacySeeds = DEFAULT_LEGACY_SEEDS,
): LegacyStore {
  async function durableCounters(): Promise<Map<string, DurableCounter>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client.from('legacy_articles') as any)
      .select('id, likes, comments_count');
    if (error) throw new Error(`Could not read legacy_articles: ${error.message ?? 'unknown error'}`);
    const map = new Map<string, DurableCounter>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of (data ?? []) as any[]) {
      map.set(String(row.id), { likes: Number(row.likes ?? 0), commentsCount: Number(row.comments_count ?? 0) });
    }
    return map;
  }

  async function getArticles(): Promise<BlogPost[]> {
    const durable = await durableCounters();
    return seeds.articles.map((article) => {
      const counter = durable.get(article.id);
      return counter
        ? { ...article, likes: counter.likes, commentsCount: counter.commentsCount }
        : { ...article };
    });
  }

  async function findArticle(key: string): Promise<BlogPost | undefined> {
    const articles = await getArticles();
    return articles.find((article) => article.slug === key || article.id === key);
  }

  async function incrementLikes(id: string): Promise<number> {
    const { data, error } = await client.rpc('increment_legacy_like', { target_id: id });
    if (error) {
      throw new Error(error.message ?? `increment_legacy_like failed for ${id}`);
    }
    const value = Number(data);
    if (!Number.isFinite(value)) {
      throw new Error(`increment_legacy_like returned an unreadable counter for ${id}`);
    }
    return value;
  }

  async function getComments(postId?: string): Promise<CommentRecord[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = client.from('legacy_comments').select('*');
    if (postId) query = query.eq('post_id', postId);
    query = query.order('inserted_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw new Error(`Could not read legacy_comments: ${error.message ?? 'unknown error'}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const durableRows = ((data ?? []) as any[]).map(rowToRecord);
    const seen = new Set(durableRows.map((row) => row.id));
    const mergedSeeds = seeds.comments
      .filter((comment) => !postId || comment.postId === postId)
      .filter((comment) => !seen.has(comment.id));
    return [...durableRows, ...mergedSeeds];
  }

  async function addComment(postId: string, input: LegacyCommentInput): Promise<CommentRecord> {
    const { data, error } = await client.rpc('add_legacy_comment', {
      target_id: postId,
      author_name: input.authorName,
      author_role: input.authorRole ?? '',
      content: input.content,
    });
    if (error) {
      throw new Error(error.message ?? `add_legacy_comment failed for ${postId}`);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = data as any;
    const row = Array.isArray(payload) ? payload[0] : payload;
    if (!row) {
      throw new Error('add_legacy_comment returned no inserted comment.');
    }
    return rowToRecord(row);
  }

  return {
    kind: 'supabase',
    getArticles,
    findArticle,
    incrementLikes,
    getComments,
    addComment,
  };
}
