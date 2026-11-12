'use client';

import { useEffect } from 'react';
import './globals.css';
import PageState from '@/components/PageState';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Fatal application error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-canvas font-serif text-ink antialiased">
        <PageState
          role="alert"
          tone="error"
          code="Fatal"
          title="ResearchWithMe could not start"
          description="The application shell failed to load. Retry the request, or return later if the problem continues."
          primaryAction={{ href: '/', label: 'Reload the platform' }}
        >
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-surface-inverse px-5 py-2.5 text-sm font-semibold text-text-inverse transition-colors hover:bg-surface-inverse/90"
          >
            Retry
          </button>
        </PageState>
      </body>
    </html>
  );
}
