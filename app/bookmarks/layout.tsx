import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Saved Reading List & Citations',
  description:
    'Review, filter, and export your locally saved ResearchWithMe articles, repository teardowns, and papers as clean Markdown bibliographies.',
  path: '/bookmarks',
  type: 'website' as const,
});

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}
