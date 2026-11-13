import type { Metadata } from 'next';
import Link from 'next/link';
import BlogFooter from '@/components/BlogFooter';
import BlogHeader from '@/components/BlogHeader';
import MotionLab from '@/components/motion/MotionLab';
import { pageMetadata } from '@/lib/seo';
import { Text, Link as TextLink } from '@/components/primitives';

export const metadata: Metadata = {
  ...pageMetadata({
    title: 'Motion Lab',
    description:
      'Interactive reference for the reme motion system: twelve animation principles, token tables, loading contracts, and lazy-loading primitives.',
    path: '/motion',
  }),
  robots: { index: false, follow: true },
};

/**
 * /motion — the design-system lab.
 *
 * Deliberately `noindex`: it is a reference surface for contributors and
 * reviewers, not a public landing page. It is linked from the footer so it can
 * be found without being advertised to search engines.
 */
export default function MotionLabPage() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <BlogHeader />
      <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-6 font-mono text-xs text-ink-secondary">
          <Link href="/" className="hover:text-ink">
            Index
          </Link>
          <span aria-hidden="true"> / </span>
          <span aria-current="page">Motion Lab</span>
        </nav>

        <header className="border-b border-line pb-8">
          <Text as="p" variant="eyebrow" color="secondary">
            reme v3.1 §9 · Interface Motion · Design System Lab
          </Text>
          <h1 className="mt-2 max-w-4xl font-serif text-3xl font-bold tracking-tight text-ink sm:text-5xl">
            Motion that explains, never decorates
          </h1>
          <p className="mt-4 max-w-[70ch] font-sans text-base leading-relaxed text-ink-secondary">
            Every animation in the product is drawn from six durations, four easings, and Disney&apos;s twelve
            principles, as catalogued by{' '}
            <TextLink
              href="https://github.com/dylantarre/animation-principles"
              rel="noreferrer noopener"
              target="_blank"
            >
              animation-principles
            </TextLink>
            . This page renders one live demo per principle plus the loading, lazy-loading, and token contracts.
            Nothing on this page should be copied into a surface without also copying its guardrail.
          </p>
        </header>

        <div className="mt-10">
          <MotionLab />
        </div>
      </main>
      <BlogFooter />
    </div>
  );
}
