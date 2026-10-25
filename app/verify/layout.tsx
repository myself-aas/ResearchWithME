import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Verify Contributor Identity',
  description: 'Review the prototype verification paths and understand what publishing permissions each role receives.',
  path: '/verify',
  type: 'website' as const,
});

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}
