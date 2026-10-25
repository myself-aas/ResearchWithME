import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Research Papers',
  description: 'Filter open-access publications by field, author, DOI, citation count, and publication date.',
  path: '/papers',
  type: 'website' as const,
});

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}
