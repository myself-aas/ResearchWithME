import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Research papers',
  description: 'Open-access papers, filterable by field, author, DOI, citation count, and date.',
  path: '/papers',
  type: 'website' as const,
});

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}
