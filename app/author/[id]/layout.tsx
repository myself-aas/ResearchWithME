import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return pageMetadata({
    title: 'Author profile',
    description: "A contributor's credentials, research areas, and publication record.",
    path: `/author/${id}`,
  });
}

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}
