export type BlogCategory = 
  | 'Research Reviews'
  | 'GitHub Repo Teardowns'
  | 'STEM & Tech'
  | 'Health & Medicine'
  | 'Sociology & Culture'
  | 'Data & Policy';

export type ArticleFormat = 
  | 'Paper Review'
  | 'Repo Teardown'
  | 'Deep-Dive Essay'
  | 'Field Notes'
  | 'Case Study';

export type PublicationType = 'review' | 'editorial';

export interface Author {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  role: string;
  domain: string;
  institution?: string;
  orcid?: string;
  github?: string;
  twitter?: string;
  website?: string;
  scholar?: string;
  /** Set only when the writer linked a real ORCID or GitHub identity. */
  verifiedVia?: 'orcid' | 'github';
  verifiedIdentifier?: string;
  verifiedTitle?: string;
  joinedDate: string;
  articleCount: number;
  totalReads?: string;
}

export interface ReviewedArtifact {
  type: 'paper' | 'github' | 'dataset';
  title: string;
  url: string;
  identifier: string; // e.g. "vllm-project/vllm" or "arXiv:2501.12948"
  meta: string; // e.g. "44.8k Stars · Apache-2.0" or "Published Jan 2026 · Nature"
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: BlogCategory;
  format: ArticleFormat;
  /** Defaults to 'review'; only the Editor-in-Chief may classify a piece as 'editorial'. */
  publicationType?: PublicationType;
  author: Author;
  publishedAt: string;
  readTime: string;
  coverImage: string;
  featured: boolean;
  reviewedArtifact?: ReviewedArtifact;
  summary: string;
  content: string[]; // Plain-text paragraphs (fallback for legacy articles)
  /** Markdown source for CMS-authored articles; rendered by MarkdownBody. */
  bodyMarkdown?: string;
  /** ISO publication date for <time dateTime> and structured data. */
  dateISO?: string;
  keyTakeaways: string[];
  tags: string[];
  likes: number;
  commentsCount: number;
}

export const CATEGORIES: BlogCategory[] = [
  'Research Reviews',
  'GitHub Repo Teardowns',
  'STEM & Tech',
  'Health & Medicine',
  'Sociology & Culture',
  'Data & Policy',
];

export { categoryToSlug, slugToCategory, CATEGORY_SLUGS, SLUG_TO_CATEGORY } from './categories';

export const AUTHORS: Record<string, Author> = {};

export const INITIAL_BLOG_POSTS: BlogPost[] = [];
