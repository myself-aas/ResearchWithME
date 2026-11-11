import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  ...pageMetadata({
    title: 'Writer Studio — Compose Review',
    description:
      'Compose and submit an open-access technical review, benchmark replication, or repository teardown with verified specialist attribution.',
    path: '/write',
    type: 'website',
  }),
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function WriteRouteLayout({ children }: { children: ReactNode }) {
  return children;
}
