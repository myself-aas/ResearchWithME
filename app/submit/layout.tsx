import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Submit a manuscript',
  description: 'Send a manuscript, dataset, or reproducible artifact to the editors.',
  path: '/submit',
  type: 'website' as const,
});

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}
