/**
 * Loader-data contracts shared by the Pages route components (client + SSR)
 * and the server loaders in `server/loaders/`. Types only — this module must
 * stay importable from the browser bundle: no server stores, no Node APIs.
 */
import type { Author, BlogPost, BlogCategory } from '@/lib/blog-data';
import type { Publication } from '@/lib/research-data';

/** Metadata a loader hands to the SSR document (see document.tsx). */
export interface RouteMetadata {
  title: string;
  description: string;
  /** Open Graph type; article-like records set 'article'. */
  type: 'website' | 'article';
  /** Canonical path override (e.g. normalised author id casing). */
  path?: string;
}

/**
 * Feed posts with the body stripped — the home/category feed only renders
 * summaries, and the hydration payload must not carry every article body.
 */
export type FeedPost = Omit<BlogPost, 'content' | 'bodyMarkdown'> & { content: [] };

/** Strips the body from a post for feed payloads. */
export function stripForFeed(post: BlogPost): FeedPost {
  const { content: _content, bodyMarkdown: _bodyMarkdown, ...rest } = post;
  return { ...rest, content: [] };
}

export interface HomeLoaderData {
  kind: 'home';
  category: BlogCategory | 'All';
  search: string;
  /** Published contributor profiles (empty on outage — the feed still renders). */
  authors: Author[];
  posts: FeedPost[];
  /** Absent — home falls back to the document's default metadata (Next parity). */
  metadata?: RouteMetadata;
}

export interface CategoryLoaderData extends Omit<HomeLoaderData, 'kind' | 'category'> {
  kind: 'category';
  category: BlogCategory;
  metadata: RouteMetadata;
}

export interface PostLoaderData {
  kind: 'post';
  /** The full article, body included — the reader renders it during SSR. */
  article: BlogPost;
  related: FeedPost[];
  metadata: RouteMetadata;
}

export interface PaperLoaderData {
  kind: 'paper';
  paper: Publication;
  metadata: RouteMetadata;
}

export interface AuthorMetrics {
  totalArticles: number;
  totalLikes: number;
  totalComments: number;
  domains: string[];
  reviewedArtifactsCount: number;
}

export interface AuthorLoaderData {
  kind: 'author';
  author: Author;
  articles: FeedPost[];
  metrics: AuthorMetrics;
  metadata: RouteMetadata;
}

export interface PapersLoaderData {
  kind: 'papers';
  /** Bundled corpus records; the client refreshes from /api/papers on mount. */
  papers: Publication[];
  metadata: RouteMetadata;
}

export interface AuthorsLoaderData {
  kind: 'authors';
  /** Published contributor profiles (empty on outage — the directory still renders). */
  authors: Author[];
  metadata: RouteMetadata;
}

/** Static-archive routes: the document needs metadata; the body imports its own bundled data. */
export interface StaticArchiveLoaderData {
  kind: 'editions' | 'editorial-board' | 'about' | 'contact' | 'privacy';
  metadata: RouteMetadata;
}

/** Reader-tool and API-reference routes (12B): metadata only; the body is bundled. */
export interface ReaderToolLoaderData {
  kind: 'assistant' | 'bookmarks' | 'cite' | 'api-docs';
  metadata: RouteMetadata;
}
