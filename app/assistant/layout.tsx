import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Assistant',
  description: 'Query the ResearchWithMe catalog with cited answers drawn from published articles and papers.',
  path: '/assistant',
  type: 'website' as const,
});

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}
