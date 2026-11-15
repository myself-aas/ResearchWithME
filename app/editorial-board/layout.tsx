import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Editor',
  description: 'The Editor-in-Chief and editorial standards for ResearchWithMe.',
  path: '/editorial-board',
  type: 'website' as const,
});

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}
