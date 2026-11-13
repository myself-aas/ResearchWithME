import BlogFooter from '@/components/BlogFooter';
import BlogHeader from '@/components/BlogHeader';
import PageState from '@/components/PageState';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <BlogHeader />
      <PageState
        role="alert"
        tone="neutral"
        code="404"
        title="This page could not be found"
        description="The address may have changed, or this piece may no longer be available. Return home to browse latest articles."
        primaryAction={{ href: '/', label: 'Browse latest articles' }}
        secondaryAction={{ href: '/authors', label: 'Browse writers' }}
      />
      <BlogFooter />
    </div>
  );
}
