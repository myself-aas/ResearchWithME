import Link from 'next/link';
import { ArrowUpRight, PenSquare, ShieldCheck } from 'lucide-react';
import { CATEGORIES, categoryToSlug } from '@/lib/blog-data';
import NewsletterSignup from '@/components/NewsletterSignup';
import BrandLogo from '@/components/BrandLogo';

const exploreLinks = [
  { href: '/papers', label: 'Paper archive' },
  { href: '/authors', label: 'Authors and specialists' },
  { href: '/editions', label: 'PDF editions' },
  { href: '/editorial-board', label: 'Editorial board' },
  { href: '/assistant', label: 'Research assistant' },
  { href: '/cite', label: 'Citation builder' },
  { href: '/bookmarks', label: 'Reading list' },
  { href: '/write', label: 'Writer studio' },
];

export default function BlogFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-surface text-ink">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <NewsletterSignup />

        <div className="grid gap-10 pt-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 rounded-sm" aria-label="𝞹eme — ResearchWithMe home">
              <BrandLogo size="md" showText={true} />
            </Link>

            <p className="mt-4 max-w-md font-sans text-sm leading-relaxed text-ink-secondary">
              An independent, open-access platform where verified specialists deconstruct research papers, GitHub repositories, and technical literature across STEM, health, sociology, and policy.
            </p>

            <dl className="mt-5 space-y-1.5 font-sans text-xs text-ink-secondary">
              <div>
                <dt className="sr-only">Identifier</dt>
                <dd className="font-mono">ISSN 2994-0821 (digital) · DOI prefix 10.5555/rwm</dd>
              </div>
              <div>
                <dt className="sr-only">License</dt>
                <dd>Creative Commons Attribution 4.0 International (CC BY 4.0)</dd>
              </div>
              <div>
                <dt className="sr-only">Funding model</dt>
                <dd>Diamond Open Access · no paywalls · no behavioural ad trackers</dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/write"
                className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-ink px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wider text-canvas transition-opacity hover:opacity-90"
              >
                <PenSquare className="h-4 w-4" aria-hidden="true" />
                <span>Write a review</span>
              </Link>
              <Link
                href="/dashboard/access"
                className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-line bg-canvas px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-surface-subtle"
              >
                <ShieldCheck className="h-4 w-4 text-brand" aria-hidden="true" />
                <span>Apply to write</span>
              </Link>
            </div>
          </div>

          <nav aria-labelledby="footer-domains">
            <h2 id="footer-domains" className="font-mono text-xs font-semibold uppercase tracking-wider text-ink">
              Editorial Columns
            </h2>
            <ul className="mt-3 space-y-2 font-sans text-sm">
              {CATEGORIES.map((category) => (
                <li key={category}>
                  <Link
                    href={`/category/${categoryToSlug(category)}`}
                    className="text-ink-secondary underline-offset-4 transition-colors hover:text-ink hover:underline"
                  >
                    {category}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-explore">
            <h2 id="footer-explore" className="font-mono text-xs font-semibold uppercase tracking-wider text-ink">
              Explore the platform
            </h2>
            <ul className="mt-3 space-y-2 font-sans text-sm">
              {exploreLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-ink-secondary underline-offset-4 transition-colors hover:text-ink hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-line pt-6 font-sans text-xs text-ink-secondary sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 ResearchWithMe Publication Collective. Published under CC BY 4.0 open access.</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href="/about" className="underline-offset-4 hover:text-ink hover:underline">
              About
            </Link>
            <Link href="/editorial-board" className="underline-offset-4 hover:text-ink hover:underline">
              Editorial standards
            </Link>
            <Link href="/privacy" className="underline-offset-4 hover:text-ink hover:underline">
              Privacy
            </Link>
            <Link href="/contact" className="underline-offset-4 hover:text-ink hover:underline">
              Contact
            </Link>
            <Link href="/cite" className="underline-offset-4 hover:text-ink hover:underline">
              Citation export
            </Link>
            <Link href="/assistant" className="inline-flex items-center gap-1 underline-offset-4 hover:text-ink hover:underline">
              <span>Synthesis</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <Link href="/motion" className="underline-offset-4 hover:text-ink hover:underline">
              Motion system
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
