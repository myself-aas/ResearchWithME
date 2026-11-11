import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  ...pageMetadata({
    title: 'Editorial Studio — Manage Articles',
    description:
      'Manage draft and published scholarly reviews, repository teardowns, and revisions in the ResearchWithMe editorial studio.',
    path: '/dashboard/manage',
    type: 'website',
  }),
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function ManageStudioLayout({ children }: { children: ReactNode }) {
  return children;
}
