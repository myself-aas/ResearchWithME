/**
 * Content types shared by server loaders, client cards, and tests.
 *
 * This module is deliberately free of `node:fs` imports so client components
 * can type their props without pulling the loader into the browser bundle.
 */

export interface PostMeta {
  /** URL segment, derived from the file name unless frontmatter overrides it. */
  slug: string;
  title: string;
  description: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** ISO date (YYYY-MM-DD) of the last revision, when recorded. */
  updated?: string;
  tags: string[];
  series?: string;
  cover?: string;
  coverAlt?: string;
  coverStyle: 'default' | 'hero';
  featured: boolean;
  draft: boolean;
  canonical?: string;
  toc: boolean;
  /** Visible questions, mirrored into FAQPage structured data. */
  faq: Array<{ question: string; answer: string }>;
  readingTimeMinutes: number;
  wordCount: number;
  /** Canonical site path, e.g. `/blog/on-reproducible-benchmarks`. */
  href: string;
}

export interface Post extends PostMeta {
  /** Raw MDX body, without frontmatter. */
  body: string;
}

export interface TagSummary {
  tag: string;
  slug: string;
  count: number;
}

export interface ArchiveYear {
  year: string;
  posts: PostMeta[];
}

/** Shape handed to the client-side search index. */
export interface SearchDoc {
  slug: string;
  href: string;
  title: string;
  description: string;
  tags: string[];
  date: string;
  readingTimeMinutes: number;
  /** Plain-text body used for full-text matching. */
  text: string;
}

/**
 * What the search page renders before the full-text index arrives: the same
 * fields minus the body. Sending bodies inline would put every article's text
 * into the HTML of `/search`, which grows without bound as the archive does.
 */
export interface SearchDocLite extends Omit<SearchDoc, 'text'> {
  text?: string;
}
