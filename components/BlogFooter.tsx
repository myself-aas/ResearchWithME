import Link from 'next/link';
import { ArrowUpRight, PenSquare, ShieldCheck } from 'lucide-react';
import { CATEGORIES } from '@/lib/blog-data';
import NewsletterSignup from '@/components/NewsletterSignup';
import BrandLogo from '@/components/BrandLogo';

const portalLinks = [
  { href: '/papers', label: 'Paper archive' },
  { href: '/authors', label: 'Authors and specialists' },
  { href: '/editions', label: 'PDF editions' },
  { href: '/editorial-board', label: 'Editorial board' },
  { href: '/assistant', label: 'Research assistant' },
  { href: '/cite', label: 'Citation builder' },
  { href: '/bookmarks', label: 'Reading list' },
  { href: '/submit', label: 'Submissions' },
  { href: '/write', label: 'Writer studio' },
];

export default function BlogFooter() {
  return (
    <footer className="dark-surface mt-16 bg-stone-900 text-stone-200">
      <div className="page-container page-section-loose max-w-wide">
        <NewsletterSignup />

        <div className="grid gap-10 pt-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 rounded-md" aria-label="πeme home">
              <BrandLogo variant="light" size="md" showText={true} />
            </Link>

            <p className="mt-4 max-w-md text-sm leading-relaxed text-stone-300">
              An independent, open-access publication: long-form reviews, repository teardowns, and essays on science, health, and research policy.
            </p>

            <dl className="mt-5 space-y-1.5 text-sm text-stone-300">
              <div>
                <dt className="sr-only">Identifier</dt>
                <dd>ISSN 2994-0821 (digital) · DOI prefix 10.5555/rwm</dd>
              </div>
              <div>
                <dt className="sr-only">License</dt>
                <dd>Creative Commons Attribution 4.0 International (CC BY 4.0)</dd>
              </div>
              <div>
                <dt className="sr-only">Funding model</dt>
                <dd>No paywalls · no ad trackers · funded by readers</dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/write"
                className="inline-flex min-h-11 items-center gap-2 rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
              >
                <PenSquare className="h-4 w-4" aria-hidden="true" />
                <span>Write a review</span>
              </Link>
              <Link
                href="/verify"
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-stone-600 px-4 py-2 text-sm font-semibold text-stone-100 transition-colors hover:border-stone-500 hover:bg-stone-800"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                <span>Check a contributor</span>
              </Link>
            </div>
          </div>

          <nav aria-labelledby="footer-domains">
            <h2 id="footer-domains" className="text-sm font-semibold uppercase tracking-wide text-stone-100">
              Domains
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {CATEGORIES.map((category) => (
                <li key={category}>
                  <Link
                    href={`/?category=${encodeURIComponent(category)}`}
                    className="text-stone-300 underline-offset-4 transition-colors hover:text-white hover:underline"
                  >
                    {category}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-portals">
            <h2 id="footer-portals" className="text-sm font-semibold uppercase tracking-wide text-stone-100">
              Publication
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {portalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-stone-300 underline-offset-4 transition-colors hover:text-white hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-stone-700 pt-6 text-sm text-stone-300 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 ResearchWithMe Publication Collective. Everything here is open access.</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href="/submit" className="underline-offset-4 hover:text-white hover:underline">
              Submission guidelines
            </Link>
            <Link href="/cite" className="underline-offset-4 hover:text-white hover:underline">
              Citation export
            </Link>
            <Link href="/assistant" className="inline-flex items-center gap-1 underline-offset-4 hover:text-white hover:underline">
              <span>Assistant</span>
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
