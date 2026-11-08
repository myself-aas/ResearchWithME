import type { Metadata } from 'next';
import PostEditor from '@/components/cms/PostEditor';

export const metadata: Metadata = {
  title: 'New article',
};

export default function NewArticlePage() {
  return <PostEditor mode="create" />;
}
