import type { BlogPost } from '@/lib/blog-data';
import type { CommentRecord } from '@/lib/db';

export type { BlogPost, CommentRecord };

/** Seed corpus used by adapters that overlay durable counters/comments. */
export interface LegacySeeds {
  articles: BlogPost[];
  comments: CommentRecord[];
}

export interface LegacyCommentInput {
  authorName: string;
  authorRole?: string;
  content: string;
}

/**
 * The durable legacy interactions store shared by the Next.js app and the
 * future Pages build. Implementations either persist to the local demo
 * filesystem (RWM_DATA_DIR or ./data) or to Supabase via the Task 3 RPCs.
 *
 * Write failures throw: callers must never report a false success.
 */
export interface LegacyStore {
  readonly kind: 'local' | 'supabase';
  getArticles(): Promise<BlogPost[]>;
  /** Look up a seed article by id or slug. */
  findArticle(key: string): Promise<BlogPost | undefined>;
  /** Increment likes atomically; returns the new counter. Throws on unknown id or persistence failure. */
  incrementLikes(id: string): Promise<number>;
  getComments(postId?: string): Promise<CommentRecord[]>;
  /** Insert a comment and increment the article's displayed counter atomically. Throws on failure. */
  addComment(postId: string, input: LegacyCommentInput): Promise<CommentRecord>;
}
