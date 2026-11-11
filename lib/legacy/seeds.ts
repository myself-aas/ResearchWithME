import type { BlogPost } from '@/lib/blog-data';
import type { CommentRecord } from '@/lib/db';
import articlesJson from '@/data/articles.json';
import commentsJson from '@/data/comments.json';
import type { LegacySeeds } from './types';

/** The checked-in demo corpus — never mutated by the stores. */
export const DEFAULT_LEGACY_SEEDS: LegacySeeds = {
  articles: articlesJson as unknown as BlogPost[],
  comments: commentsJson as unknown as CommentRecord[],
};
