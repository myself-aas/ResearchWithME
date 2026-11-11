import type { Metadata } from 'next';
import PostEditor from '@/components/cms/PostEditor';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  ...pageMetadata({
    title: 'Editorial Studio — New Article',
    description:
      'Draft, preview, and publish verified scholarly reviews, benchmark replications, and repository teardowns in the ResearchWithMe editorial studio.',
    path: '/dashboard',
    type: 'website',
  }),
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function NewArticlePage() {
  return <PostEditor mode="create" />;
}
