import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { CATEGORIES, categoryToSlug } from '@/lib/blog-data';
import BrandLogo from '@/components/BrandLogo';
import ThemeToggle from '@/components/ThemeToggle';
import { Text, Link as TextLink } from '@/components/primitives';

const exploreLinks = [
  { href: '/', label: 'Articles' },
  { href: '/authors', label: 'Writers' },
  { href: '/assistant', label: 'Assistant' },
  { href: '/cite', label: 'Citation builder' },
  { href: '/bookmarks', label: 'Reading list' },
  { href: '/editorial-board', label: 'Editor' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/privacy', label: 'Privacy' },
];

export default function BlogFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-surface text-ink">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 pt-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 rounded-sm" aria-label="ResearchWithMe home">
              <BrandLogo size="md" showText={true} />
            </Link>

            <p className="mt-4 max-w-md font-sans text-sm leading-relaxed text-ink-secondary">
              An open platform for long-form explanations of published research and open-source code. Articles are written by writers approved by the editor.
            </p>

            <p className="mt-4 font-sans text-sm text-ink-secondary">
              Articles are published under CC BY 4.0.
            </p>
          </div>

          <nav aria-labelledby="footer-domains">
            <Text id="footer-domains" as="h2" variant="eyebrow" weight="semibold">
              Topics
            </Text>
            <ul className="mt-3 space-y-2 font-sans text-sm">
              {CATEGORIES.map((category) => (
                <li key={category}>
                  <TextLink
                    href={`/category/${categoryToSlug(category)}`}
                    variant="muted"
                  >
                    {category}
                  </TextLink>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-explore">
            <Text id="footer-explore" as="h2" variant="eyebrow" weight="semibold">
              Explore
            </Text>
            <ul className="mt-3 space-y-2 font-sans text-sm">
              {exploreLinks.map((link) => (
                <li key={link.href}>
                  <TextLink
                    href={link.href}
                    variant="muted"
                  >
                    {link.label}
                  </TextLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-line pt-6 font-sans text-xs text-ink-secondary sm:flex-row sm:items-center sm:justify-between">
          <p>ResearchWithMe (πeme) · Edited by Ashif Ahmed Shuvo</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <ThemeToggle />
            <TextLink href="/assistant" variant="quiet" className="inline-flex items-center gap-1">
              <span>Assistant</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </TextLink>
            <TextLink href="/motion" variant="quiet">
              Motion system
            </TextLink>
          </div>
        </div>
      </div>
    </footer>
  );
}
