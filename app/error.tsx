'use client';

import { useEffect } from 'react';
import BlogFooter from '@/components/BlogFooter';
import BlogHeader from '@/components/BlogHeader';
import PageState from '@/components/PageState';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <BlogHeader />
      <PageState
        role="alert"
        tone="error"
        code="Error"
        title="We could not open this page"
        description="The request did not complete. Your reading list and drafts are stored separately, so you can retry without losing them."
        primaryAction={{ href: '/', label: 'Return to the platform' }}
        secondaryAction={{ href: '/papers', label: 'Browse the paper archive' }}
      >
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-surface-inverse px-5 py-2.5 text-sm font-semibold text-text-inverse transition-colors hover:bg-surface-inverse/90"
        >
          Try again
        </button>
      </PageState>
      <BlogFooter />
    </div>
  );
}
