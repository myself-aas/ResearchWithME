/**
 * JSON-LD structured data — schemas follow schema.org (WebSite / Organization /
 * Article / ScholarlyArticle / VideoObject) with stable @id URIs so entity graphs
 * unify across pages without duplicate anonymous declarations.
 */
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl, toIsoDate } from '@/lib/seo';

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export function organizationEntity() {
  return {
    '@id': ORGANIZATION_ID,
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        ...organizationEntity(),
        description: SITE_DESCRIPTION,
      },
      {
        '@id': WEBSITE_ID,
        '@type': 'WebSite',
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        publisher: { '@id': ORGANIZATION_ID },
      },
    ],
  };
}

export interface ArticleJsonLdInput {
  title: string;
  description: string;
  path: string;
  authorName: string;
  authorId?: string;
  authorSameAs?: string[];
  datePublished?: string;
  imagePath?: string;
}

/**
 * JSON-LD must never carry a raw data URI: structured data is consumed by
 * crawlers, not browsers, and an embedded base64 image both bloats the
 * document and produces a useless `/data:...` URL. CMS covers stored as
 * data URIs are simply omitted from the Article schema.
 */
function jsonLdImage(imagePath?: string): string[] | undefined {
  if (!imagePath) return undefined;
  const trimmed = imagePath.trim();
  if (!trimmed || /^data:/i.test(trimmed)) return undefined;
  return [absoluteUrl(trimmed)];
}

export function articleJsonLd(input: ArticleJsonLdInput) {
  const sameAs = (input.authorSameAs ?? []).filter(Boolean);
  const author = input.authorId
    ? {
        '@id': `${absoluteUrl(`/author/${input.authorId}`)}#person`,
        '@type': 'Person' as const,
        name: input.authorName,
        url: absoluteUrl(`/author/${input.authorId}`),
        ...(sameAs.length > 0 ? { sameAs } : {}),
      }
    : { '@type': 'Person' as const, name: input.authorName };

  return {
    '@context': 'https://schema.org',
    '@id': `${absoluteUrl(input.path)}#article`,
    '@type': 'Article',
    headline: input.title,
    description: input.description,
    mainEntityOfPage: absoluteUrl(input.path),
    image: jsonLdImage(input.imagePath),
    author,
    publisher: organizationEntity(),
    datePublished: toIsoDate(input.datePublished),
  };
}

export interface VideoJsonLdInput {
  name: string;
  description: string;
  contentPath: string;
  thumbnailPath?: string;
  uploadDate?: string;
}

export function videoJsonLd(input: VideoJsonLdInput) {
  const thumb =
    input.thumbnailPath && !/^data:/i.test(input.thumbnailPath.trim())
      ? absoluteUrl(input.thumbnailPath)
      : absoluteUrl('/images/folio-hero.jpeg');
  return {
    '@context': 'https://schema.org',
    '@id': `${absoluteUrl(input.contentPath)}#video`,
    '@type': 'VideoObject',
    name: input.name,
    description: input.description,
    thumbnailUrl: [thumb],
    contentUrl: absoluteUrl(input.contentPath),
    uploadDate: toIsoDate(input.uploadDate) ?? '2026-10-01',
    publisher: organizationEntity(),
  };
}

export interface ScholarlyAuthorInput {
  name: string;
  slug?: string;
  orcid?: string;
}

export interface ScholarlyArticleJsonLdInput {
  title: string;
  description: string;
  path: string;
  authors: string[];
  authorProfiles?: ScholarlyAuthorInput[];
  datePublished?: string;
  doi?: string;
  journal?: string;
}

export function scholarlyArticleJsonLd(input: ScholarlyArticleJsonLdInput) {
  const authorEntities = input.authorProfiles
    ? input.authorProfiles.map((profile) => {
        const orcidUrl = profile.orcid
          ? profile.orcid.startsWith('http')
            ? profile.orcid
            : `https://orcid.org/${profile.orcid}`
          : undefined;
        return {
          ...(profile.slug ? { '@id': `${absoluteUrl(`/papers`)}#${profile.slug}` } : {}),
          '@type': 'Person' as const,
          name: profile.name,
          ...(orcidUrl ? { url: orcidUrl, sameAs: [orcidUrl] } : {}),
        };
      })
    : input.authors.map((name) => ({ '@type': 'Person' as const, name }));

  return {
    '@context': 'https://schema.org',
    '@id': `${absoluteUrl(input.path)}#scholarly-article`,
    '@type': 'ScholarlyArticle',
    headline: input.title,
    description: input.description,
    mainEntityOfPage: absoluteUrl(input.path),
    author: authorEntities,
    publisher: organizationEntity(),
    datePublished: toIsoDate(input.datePublished),
    ...(input.doi ? { sameAs: `https://doi.org/${input.doi}` } : {}),
    ...(input.journal ? { isPartOf: { '@type': 'Periodical', name: input.journal } } : {}),
  };
}

/** Render a JSON-LD script tag safely (JSON.stringify escapes </script> via \u003c). */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export interface PersonJsonLdInput {
  id: string;
  name: string;
  role?: string;
  bio?: string;
  institution?: string;
  orcid?: string;
  github?: string;
  website?: string;
  scholar?: string;
}

export function personJsonLd(author: PersonJsonLdInput) {
  const profileUrl = absoluteUrl(`/author/${author.id}`);
  const sameAs = [
    author.orcid
      ? author.orcid.startsWith('http')
        ? author.orcid
        : `https://orcid.org/${author.orcid}`
      : undefined,
    author.github
      ? author.github.startsWith('http')
        ? author.github
        : `https://github.com/${author.github.replace(/^@/, '')}`
      : undefined,
    author.website,
    author.scholar,
  ].filter((entry): entry is string => Boolean(entry));

  return {
    '@context': 'https://schema.org',
    '@id': `${profileUrl}#person`,
    '@type': 'Person',
    name: author.name,
    url: profileUrl,
    ...(author.role ? { jobTitle: author.role } : {}),
    ...(author.bio ? { description: author.bio } : {}),
    ...(author.institution
      ? { affiliation: { '@type': 'Organization', name: author.institution } }
      : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

export function aboutPageJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@id': `${absoluteUrl('/about')}#about`,
    '@type': 'AboutPage',
    name: `About ${SITE_NAME}`,
    url: absoluteUrl('/about'),
    mainEntity: organizationEntity(),
  };
}

export function contactPageJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@id': `${absoluteUrl('/contact')}#contact`,
    '@type': 'ContactPage',
    name: `Contact ${SITE_NAME}`,
    url: absoluteUrl('/contact'),
    mainEntity: {
      ...organizationEntity(),
      email: 'editorial@researchwith.me',
    },
  };
}
