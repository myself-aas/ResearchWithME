import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Writer Studio',
  description: 'Compose, preview, and publish a structured article with reproducible artifact metadata.',
  path: '/write',
  type: 'website' as const,
});

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}
