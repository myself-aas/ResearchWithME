import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Research Synthesis Assistant',
  description:
    'Query the ResearchWithMe catalog with grounded, source-cited answers drawn directly from published peer reviews, benchmarks, and indexed papers.',
  path: '/assistant',
  type: 'website' as const,
});

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}
