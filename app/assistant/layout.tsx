import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Assistant',
  description: 'Ask the archive a question and get an answer with links to the reviews behind it.',
  path: '/assistant',
  type: 'website' as const,
});

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}
