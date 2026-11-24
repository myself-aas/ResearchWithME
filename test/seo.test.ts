import { describe, expect, it } from 'vitest';
import { frontmatterSchema } from '@/lib/content/schema';
import {
  PERSON_ID,
  WEBSITE_ID,
  articleJsonLd,
  breadcrumbJsonLd,
  collectionPageJsonLd,
  faqPageJsonLd,
  profilePageJsonLd,
  websiteJsonLd,
} from '@/lib/seo/jsonld';
import type { PostMeta } from '@/lib/content/types';

interface Node {
  '@id'?: string;
  '@type'?: string;
  [key: string]: unknown;
}

function typed<T>(value: unknown): T {
  return value as T;
}

function graphOf(data: { '@graph': Node[] }): Node[] {
  return data['@graph'];
}

function findNode(data: { '@graph': Node[] }, type: string): Node | undefined {
  return graphOf(data).find((node) => node['@type'] === type);
}

const crumbs = [
  { name: 'Home', href: '/' },
  { name: 'Writing', href: '/blog' },
  { name: 'A post' },
];

const baseInput = {
  title: 'A post',
  description: 'A description long enough to look like a real one.',
  path: '/blog/a-post',
  datePublished: '2026-01-02T00:00:00.000Z',
  dateModified: '2026-02-03T00:00:00.000Z',
  tags: ['reproducibility'],
  imagePath: '/blog/a-post/opengraph-image',
  wordCount: 1200,
  crumbs,
};

describe('websiteJsonLd', () => {
  it('describes the site and its search action once', () => {
    const site = findNode(websiteJsonLd(), 'WebSite')!;
    expect(site['@id']).toBe(WEBSITE_ID);
    const action = typed<{ target: { urlTemplate: string }; 'query-input': string }>(site.potentialAction);
    expect(action.target.urlTemplate).toContain('/search?q={search_term_string}');
    expect(action['query-input']).toBe('required name=search_term_string');
  });

  it('resolves the author through the same @id used by articles', () => {
    const person = findNode(websiteJsonLd(), 'Person')!;
    expect(person['@id']).toBe(PERSON_ID);
    expect(person.url).toMatch(/\/about$/);
  });
});

describe('profilePageJsonLd', () => {
  it('points the profile page at the shared Person identity', () => {
    const profile = findNode(profilePageJsonLd(), 'ProfilePage')!;
    expect(typed<{ '@id': string }>(profile.mainEntity)['@id']).toBe(PERSON_ID);
    expect(typed<{ '@id': string }>(profile.isPartOf)['@id']).toBe(WEBSITE_ID);
  });
});

describe('articleJsonLd', () => {
  it('emits one BlogPosting with stable ids and a real modified date', () => {
    const data = articleJsonLd(baseInput);
    const article = findNode(data, 'BlogPosting')!;

    expect(article['@id']).toBe('https://researchwith.me/blog/a-post#article');
    expect(article.dateModified).toBe('2026-02-03T00:00:00.000Z');
    expect(article.dateModified).not.toBe(article.datePublished);
    expect(article.author).toEqual({ '@id': PERSON_ID });
    expect(article.publisher).toEqual({ '@id': PERSON_ID });
    expect(article.isPartOf).toEqual({ '@id': WEBSITE_ID });
    expect(article.wordCount).toBe(1200);
    expect(article.image).toMatchObject({ width: 1200, height: 630 });
  });

  it('carries a BreadcrumbList with the visible trail', () => {
    const breadcrumb = findNode(articleJsonLd(baseInput), 'BreadcrumbList')!;
    const items = typed<Array<Record<string, unknown>>>(breadcrumb.itemListElement);
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({
      position: 1,
      name: 'Home',
      item: 'https://researchwith.me/',
    });
    expect(items[2]).toMatchObject({
      position: 3,
      name: 'A post',
      item: 'https://researchwith.me/blog/a-post',
    });
  });

  it('only emits FAQPage when the page has a visible FAQ', () => {
    expect(findNode(articleJsonLd(baseInput), 'FAQPage')).toBeUndefined();

    const withFaq = articleJsonLd({
      ...baseInput,
      faq: [{ question: 'Is this visible?', answer: 'Yes, it is rendered above the footer.' }],
    });
    const faq = findNode(withFaq, 'FAQPage')!;
    const questions = typed<Array<{ '@type': string; acceptedAnswer: { text: string } }>>(faq.mainEntity);
    expect(questions[0]['@type']).toBe('Question');
    expect(questions[0].acceptedAnswer.text).toContain('rendered above the footer');
  });
});

describe('small graph builders', () => {
  it('numbers breadcrumb items from 1', () => {
    const breadcrumb = breadcrumbJsonLd(crumbs, '/blog/a-post');
    expect(breadcrumb.itemListElement.map((item) => item.position)).toEqual([1, 2, 3]);
  });

  it('models the tag index as a collection of its own links', () => {
    const tagIndex = collectionPageJsonLd({
      name: 'Archive',
      description: 'Every essay.',
      path: '/blog',
      posts: [] as PostMeta[],
    });
    const page = findNode(tagIndex, 'CollectionPage')!;
    expect(typed<{ numberOfItems: number }>(page.mainEntity).numberOfItems).toBe(0);
  });

  it('uses the page URL as the FAQ id', () => {
    const faq = faqPageJsonLd([], '/blog/a-post');
    expect(faq['@id']).toBe('https://researchwith.me/blog/a-post#faq');
  });
});

describe('faq frontmatter', () => {
  const base = {
    title: 'A post',
    description: 'A description long enough to look like a real one.',
    date: '2026-01-02',
  };

  it('defaults to no FAQ', () => {
    const parsed = frontmatterSchema.parse(base);
    expect(parsed.faq).toEqual([]);
  });

  it('rejects a question that is not a question', () => {
    const result = frontmatterSchema.safeParse({
      ...base,
      faq: [{ question: 'Short', answer: 'This answer is long enough to pass the minimum.' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an answer too short to be useful', () => {
    const result = frontmatterSchema.safeParse({
      ...base,
      faq: [{ question: 'Why does this fail?', answer: 'Too short.' }],
    });
    expect(result.success).toBe(false);
  });
});
