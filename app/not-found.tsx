import BlogFooter from '@/components/BlogFooter';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
};
import BlogHeader from '@/components/BlogHeader';
import PageState from '@/components/PageState';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <BlogHeader />
      <PageState
        role="alert"
        tone="neutral"
        code="404"
        title="This page is not in the archive"
        description="The address may have changed, or the page may be gone. Start from the journal, or search the paper archive."
        primaryAction={{ href: '/', label: 'Browse the latest reviews' }}
        secondaryAction={{ href: '/papers', label: 'Search papers' }}
      />
      <BlogFooter />
    </div>
  );
}
