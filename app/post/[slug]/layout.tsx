import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { INITIAL_BLOG_POSTS } from '@/lib/blog-data';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = INITIAL_BLOG_POSTS.find((item) => item.slug === slug);
  return pageMetadata({
    title: article?.title ?? 'Research Article',
    description: article?.summary ?? 'Read the full long-form analysis, key takeaways, author credentials, and peer discussion.',
    path: `/post/${slug}`,
    type: 'article',
  });
}

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}
