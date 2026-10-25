import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Submit a Manuscript',
  description: 'Share a manuscript, dataset, or reproducible artifact with the editorial collective.',
  path: '/submit',
  type: 'website' as const,
});

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}
