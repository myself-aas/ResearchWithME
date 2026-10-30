import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Reading list',
  description: 'The reviews and papers you saved on this device, ready to export.',
  path: '/bookmarks',
  type: 'website' as const,
});

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children;
}
