import BlogFooter from '@/components/BlogFooter';
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
        description="The address may have changed, or this piece may no longer be available. Browse the platform or search the paper archive to continue."
        primaryAction={{ href: '/', label: 'Browse latest articles' }}
        secondaryAction={{ href: '/papers', label: 'Search papers' }}
      />
      <BlogFooter />
    </div>
  );
}
