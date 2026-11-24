'use client';

import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main-content" className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-5 py-20 sm:px-6">
      <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-destructive">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        Something broke
      </p>
      <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight text-ink">
        This page could not be rendered.
      </h1>
      <p className="mt-4 max-w-xl font-sans text-base leading-relaxed text-ink-secondary">
        The error has been logged. Retrying usually works; if it keeps failing, the archive and the rest of the
        site are still readable. The machine-readable form of this response is{' '}
        <Link href="/errors/500" className="text-brand underline underline-offset-4 hover:text-brand-pressed">
          problem+json
        </Link>
        .
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-xs text-ink-secondary">Reference: {error.digest}</p>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-action-primary px-6 py-2.5 font-sans text-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
        <Link
          href="/blog"
          className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-5 py-2.5 font-sans text-sm font-semibold text-ink transition-colors hover:border-brand"
        >
          Browse the archive
        </Link>
      </div>
    </main>
  );
}
