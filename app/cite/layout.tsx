import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Citation builder',
  description: 'Copy a citation in BibTeX, RIS, APA, MLA, or Chicago style.',
  path: '/cite',
  type: 'website' as const,
});

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}
