/**
 * JSON-LD structured data — audit fix: post/paper pages previously rendered
 * no application/ld+json. Schemas follow schema.org (Article / ScholarlyArticle).
 */
import { SITE_NAME, SITE_URL, absoluteUrl } from '@/lib/seo';

export interface ArticleJsonLdInput {
  title: string;
  description: string;
  path: string;
  authorName: string;
  datePublished?: string;
  imagePath?: string;
}

export function articleJsonLd(input: ArticleJsonLdInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.title,
    description: input.description,
    mainEntityOfPage: absoluteUrl(input.path),
    image: input.imagePath ? [absoluteUrl(input.imagePath)] : undefined,
    author: { '@type': 'Person', name: input.authorName },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    datePublished: input.datePublished,
  };
}

export interface ScholarlyArticleJsonLdInput {
  title: string;
  description: string;
  path: string;
  authors: string[];
  datePublished?: string;
  doi?: string;
  journal?: string;
}

export function scholarlyArticleJsonLd(input: ScholarlyArticleJsonLdInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline: input.title,
    description: input.description,
    mainEntityOfPage: absoluteUrl(input.path),
    author: input.authors.map((name) => ({ '@type': 'Person', name })),
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    datePublished: input.datePublished,
    ...(input.doi ? { sameAs: `https://doi.org/${input.doi}` } : {}),
    ...(input.journal ? { isPartOf: { '@type': 'Periodical', name: input.journal } } : {}),
  };
}

/** Render a JSON-LD script tag safely (JSON.stringify escapes </script> via \u003c). */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
