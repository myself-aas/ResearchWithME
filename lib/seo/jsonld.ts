/**
 * JSON-LD for a single-author blog.
 *
 * Every node gets a stable `@id`, and nodes reference each other by `@id`
 * instead of restating fields. That is what lets a crawler resolve one
 * `Person` entity across the home page, the about page, and every article,
 * rather than guessing that three half-filled authors are the same person.
 *
 * Only things that are visible on the page are described. No aggregate
 * ratings, no hidden FAQs, no invented publishers.
 */
import { AUTHOR, SITE } from '@/lib/site';
import { absoluteUrl } from '@/lib/seo';
import type { PostMeta } from '@/lib/content/types';

const ABOUT_URL = absoluteUrl('/about');

export const PERSON_ID = `${ABOUT_URL}#person`;
export const WEBSITE_ID = `${SITE.url}/#website`;

function personNode() {
  return {
    '@id': PERSON_ID,
    '@type': 'Person',
    name: AUTHOR.name,
    description: AUTHOR.bio,
    url: ABOUT_URL,
    image: absoluteUrl(AUTHOR.avatar),
    jobTitle: AUTHOR.role,
    sameAs: AUTHOR.links.filter((link) => link.href.startsWith('http')).map((link) => link.href),
  };
}

function websiteNode() {
  return {
    '@id': WEBSITE_ID,
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    inLanguage: SITE.language,
    publisher: { '@id': PERSON_ID },
  };
}

/** Home page: the site entity, its search action, and the author it resolves to. */
export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      personNode(),
      {
        ...websiteNode(),
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${absoluteUrl('/search')}?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };
}

/** `/about` is the resolvable home of the `Person` entity used everywhere else. */
export function profilePageJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      personNode(),
      {
        '@id': `${ABOUT_URL}#profile`,
        '@type': 'ProfilePage',
        name: `About ${AUTHOR.name}`,
        url: ABOUT_URL,
        description: AUTHOR.bio,
        mainEntity: { '@id': PERSON_ID },
        isPartOf: { '@id': WEBSITE_ID },
        inLanguage: SITE.language,
      },
      websiteNode(),
    ],
  };
}

export interface Crumb {
  name: string;
  /** Omitted for the current page; the current path supplies the URL. */
  href?: string;
}

/** BreadcrumbList built from the same array that renders the visible trail. */
export function breadcrumbJsonLd(crumbs: Crumb[], currentPath: string) {
  return {
    '@context': 'https://schema.org',
    '@id': `${absoluteUrl(currentPath)}#breadcrumb`,
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.href ?? currentPath),
    })),
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
  wordCount?: number;
  crumbs?: Crumb[];
  faq?: Array<{ question: string; answer: string }>;
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
  wordCount,
  crumbs,
  faq,
}: ArticleJsonLdInput) {
  const url = absoluteUrl(path);

  const graph: Record<string, unknown>[] = [
    websiteNode(),
    personNode(),
    {
      '@id': `${url}#article`,
      '@type': 'BlogPosting',
      headline: title,
      description,
      datePublished,
      dateModified: dateModified ?? datePublished,
      url,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      author: { '@id': PERSON_ID },
      publisher: { '@id': PERSON_ID },
      isPartOf: { '@id': WEBSITE_ID },
      inLanguage: SITE.language,
      isAccessibleForFree: true,
      ...(canonical ? { sameAs: canonical } : {}),
      ...(tags?.length ? { keywords: tags.join(', ') } : {}),
      ...(wordCount ? { wordCount } : {}),
      ...(imagePath
        ? {
            image: {
              '@type': 'ImageObject',
              url: imagePath.startsWith('http') ? imagePath : absoluteUrl(imagePath),
              width: 1200,
              height: 630,
              caption: title,
            },
          }
        : {}),
    },
  ];

  if (crumbs?.length) {
    const { '@context': _context, ...breadcrumb } = breadcrumbJsonLd(crumbs, path);
    graph.push(breadcrumb);
  }
  if (faq?.length) graph.push(faqPageJsonLd(faq, path));

  return { '@context': 'https://schema.org', '@graph': graph };
}

/** FAQPage is emitted only when the questions are rendered on the page. */
export function faqPageJsonLd(items: Array<{ question: string; answer: string }>, path: string) {
  return {
    '@id': `${absoluteUrl(path)}#faq`,
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

/** A plain page entity (contact, privacy) resolved into the site graph. */
export function webPageJsonLd({
  name,
  description,
  path,
  type = 'WebPage',
}: {
  name: string;
  description: string;
  path: string;
  type?: 'WebPage' | 'ContactPage';
}) {
  const url = absoluteUrl(path);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      websiteNode(),
      personNode(),
      {
        '@id': url,
        '@type': type,
        name,
        description,
        url,
        isPartOf: { '@id': WEBSITE_ID },
        about: { '@id': PERSON_ID },
        inLanguage: SITE.language,
      },
    ],
  };
}

/** Topic index: the visible list of tags, as an ItemList. */
export function tagIndexJsonLd(tags: Array<{ tag: string; slug: string; count: number }>) {
  const url = absoluteUrl('/tags');
  return {
    '@context': 'https://schema.org',
    '@graph': [
      websiteNode(),
      {
        '@id': url,
        '@type': 'CollectionPage',
        name: 'Topics',
        url,
        isPartOf: { '@id': WEBSITE_ID },
        inLanguage: SITE.language,
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: tags.length,
          itemListElement: tags.map((tag, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: absoluteUrl(`/tags/${tag.slug}`),
            name: tag.tag,
          })),
        },
      },
    ],
  };
}

/** Listing page: an ItemList of exactly the posts rendered on it. */
export function collectionPageJsonLd({
  name,
  description,
  path,
  posts,
}: {
  name: string;
  description: string;
  path: string;
  posts: PostMeta[];
}) {
  const url = absoluteUrl(path);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      websiteNode(),
      {
        '@id': url,
        '@type': 'CollectionPage',
        name,
        description,
        url,
        isPartOf: { '@id': WEBSITE_ID },
        inLanguage: SITE.language,
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: posts.length,
          itemListElement: posts.map((post, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: absoluteUrl(post.href),
            name: post.title,
          })),
        },
      },
    ],
  };
}

/** Safely inline JSON-LD; `<` is escaped so content cannot close the script tag. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
