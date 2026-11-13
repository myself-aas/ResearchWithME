import { describe, expect, it, vi } from 'vitest';
import type { BlogPost } from '@/lib/blog-data';

const article = { id: 'cms-article-id', slug: 'canonical-article-slug', title: 'Published article', summary: 'An original review.' } as BlogPost;

vi.mock('@/lib/cms/catalogue', () => ({
  getCachedArticleCatalogue: vi.fn(async () => [article]),
}));

import { generateMetadata } from '@/app/post/[slug]/page';

describe('article SEO', () => {
  it('uses the published slug as canonical even when the reader uses an ID alias', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: article.id }) });
    expect(metadata.alternates?.canonical).toBe(`/post/${article.slug}`);
    expect(metadata.openGraph?.url).toBe(`https://researchwith.me/post/${article.slug}`);
  });
});
