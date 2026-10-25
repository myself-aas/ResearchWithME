import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Citation Builder',
  description: 'Generate BibTeX, RIS, APA, MLA, and Chicago citations from a publication or custom source.',
  path: '/cite',
  type: 'website' as const,
});

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}
