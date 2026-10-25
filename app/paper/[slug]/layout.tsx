import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PUBLICATIONS_DATA } from '@/lib/research-data';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const paper = PUBLICATIONS_DATA.find((item) => item.slug === slug);
  return pageMetadata({
    title: paper?.title ?? 'Research Paper',
    description: paper?.abstract ?? 'Read the full structured publication, methods, findings, references, and citation metadata.',
    path: `/paper/${slug}`,
    type: 'article',
  });
}

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}
