import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Curated Print & PDF Editions',
  description:
    'Download curated, print-ready quarterly compendiums gathering peer reviews, benchmark replications, and methodology notes for offline reading.',
  path: '/editions',
  type: 'website' as const,
});

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}
