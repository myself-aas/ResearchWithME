import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Verify a contributor',
  description: 'What each contributor identity unlocks, and what this local prototype does and does not check.',
  path: '/verify',
  type: 'website' as const,
});

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}
