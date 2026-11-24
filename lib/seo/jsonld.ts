/**
 * JSON-LD for a blog: WebSite on the home page and BlogPosting on each essay.
 * Stable @id URIs let crawlers unify the author and site entities.
 */
import { AUTHOR, SITE } from '@/lib/site';
import { absoluteUrl } from '@/lib/seo';

export const PERSON_ID = `${SITE.url}/#person`;
export const WEBSITE_ID = `${SITE.url}/#website`;

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@id': PERSON_ID,
        '@type': 'Person',
        name: AUTHOR.name,
        description: AUTHOR.bio,
        url: absoluteUrl('/about'),
        sameAs: AUTHOR.links.filter((link) => link.href.startsWith('http')).map((link) => link.href),
      },
      {
        '@id': WEBSITE_ID,
        '@type': 'WebSite',
        name: SITE.name,
        url: SITE.url,
        description: SITE.description,
        inLanguage: SITE.language,
        author: { '@id': PERSON_ID },
      },
    ],
  };
}

export interface ArticleJsonLdInput {
  title: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified?: string;
  tags?: string[];
  imagePath?: string;
  canonical?: string;
}

export function articleJsonLd({
  title,
  description,
  path,
  datePublished,
  dateModified,
  tags,
  imagePath,
  canonical,
}: ArticleJsonLdInput) {
  const url = absoluteUrl(path);
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    datePublished,
    dateModified: dateModified ?? datePublished,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    ...(canonical ? { sameAs: canonical } : {}),
    ...(tags?.length ? { keywords: tags.join(', ') } : {}),
    ...(imagePath
      ? { image: imagePath.startsWith('http') ? imagePath : absoluteUrl(imagePath) }
      : {}),
    author: {
      '@type': 'Person',
      '@id': PERSON_ID,
      name: AUTHOR.name,
      url: absoluteUrl('/about'),
    },
    publisher: { '@type': 'Person', '@id': PERSON_ID, name: AUTHOR.name },
    inLanguage: SITE.language,
    isAccessibleForFree: true,
    license: SITE.licenseUrl,
  };
}

/** Safely inline JSON-LD; `<` is escaped so content cannot close the script tag. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
