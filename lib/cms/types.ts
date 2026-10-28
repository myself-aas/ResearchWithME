import type { ArticleFormat, BlogCategory } from '@/lib/blog-data';

export type CmsStatus = 'draft' | 'published';

export interface DashboardUser {
  id: string;
  email: string;
  name: string;
  /** Present in public.editors. Signing in alone grants no studio access. */
  isEditor: boolean;
}

export interface CmsPost {
  id: string;
  title: string;
  slug: string;
  /** Markdown source. Rendered by components/MarkdownBody. */
  content: string;
  status: CmsStatus;
  subtitle: string;
  summary: string;
  category: BlogCategory;
  format: ArticleFormat;
  authorId: string | null;
  authorName: string;
  coverImage: string | null;
  tags: string[];
  keyTakeaways: string[];
  readTime: string;
  featured: boolean;
  likes: number;
  publishedAt: string | null;
  insertedAt: string;
  updatedAt: string;
}

/** Fully normalised write payload. Timestamps and ids are store-owned. */
export interface CmsPostInput {
  title: string;
  slug: string;
  content: string;
  status: CmsStatus;
  subtitle: string;
  summary: string;
  category: BlogCategory;
  format: ArticleFormat;
  authorId: string | null;
  authorName: string;
  coverImage: string | null;
  tags: string[];
  keyTakeaways: string[];
  readTime: string;
  featured: boolean;
}

export interface CmsComment {
  id: string;
  /** Numeric post id as a string, matching posts.id. */
  postId: string;
  postTitle: string;
  authorName: string;
  authorRole: string;
  content: string;
  insertedAt: string;
}

export interface CmsCommentInput {
  authorName: string;
  authorRole: string;
  content: string;
}

export type FieldErrors = Record<string, string>;

export interface CmsStore {
  readonly kind: 'local' | 'supabase';
  listPosts(): Promise<CmsPost[]>;
  getPost(id: string): Promise<CmsPost | null>;
  getPostBySlug(slug: string): Promise<CmsPost | null>;
  createPost(input: CmsPostInput): Promise<CmsPost>;
  updatePost(id: string, input: CmsPostInput): Promise<CmsPost>;
  deletePost(id: string): Promise<void>;
  incrementLikes(id: string): Promise<number>;
  listComments(): Promise<CmsComment[]>;
  listCommentsForPost(postId: string): Promise<CmsComment[]>;
  /** Comment totals keyed by CMS post id, used by feed cards and metadata. */
  listCommentCounts(): Promise<Record<string, number>>;
  getComment(id: string): Promise<CmsComment | null>;
  createComment(postId: string, input: CmsCommentInput): Promise<CmsComment>;
  deleteComment(id: string): Promise<void>;
}
