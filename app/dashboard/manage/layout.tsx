import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SITE_NAME } from '@/lib/seo';

export const metadata: Metadata = {
  title: `Articles | ${SITE_NAME}`,
};

export default function StudioSectionLayout({ children }: { children: ReactNode }) {
  return children;
}
