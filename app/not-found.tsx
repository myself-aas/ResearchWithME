import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, Search } from 'lucide-react';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 py-20 sm:px-6">
        <p className="font-mono text-xs uppercase tracking-wider text-ink-secondary">404</p>
        <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          That page is not in the archive.
        </h1>
        <p className="mt-4 max-w-xl font-sans text-base leading-relaxed text-ink-secondary">
          The link may be old, or the essay may have moved. The archive and the search page both know where
          everything lives.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/posts"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-action-primary px-6 py-2.5 font-sans text-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Browse the archive
          </Link>
          <Link
            href="/search"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 font-sans text-sm font-semibold text-ink transition-colors hover:border-brand"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Search
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
