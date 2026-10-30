import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'PDF editions',
  description: 'Print-ready compendiums of published reviews for offline and library reading.',
  path: '/editions',
  type: 'website' as const,
});

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}
