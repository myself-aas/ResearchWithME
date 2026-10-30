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
    <div className="flex min-h-screen flex-col bg-stone-50">
      <BlogHeader />
      <PageState
        role="alert"
        tone="error"
        code="Error"
        title="This page did not load"
        description="The request failed before the page was built. Your reading list and drafts live in the browser, so retrying will not lose them."
        primaryAction={{ href: '/', label: 'Return to the journal' }}
        secondaryAction={{ href: '/papers', label: 'Search the paper archive' }}
      >
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-800"
        >
          Try again
        </button>
      </PageState>
      <BlogFooter />
    </div>
  );
}
