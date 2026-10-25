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
    title: 'Author Profile',
    description: "Explore a verified contributor's credentials, publication record, and research domains.",
    path: `/author/${id}`,
  });
}

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}
