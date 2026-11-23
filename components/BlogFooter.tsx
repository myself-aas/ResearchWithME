import Link from 'next/link';
import { CATEGORIES, categoryToSlug } from '@/lib/blog-data';
import BrandLogo from '@/components/BrandLogo';
import { Text, Link as TextLink } from '@/components/primitives';

const researchLinks = [
  { href: '/feed', label: 'Research feed' },
  { href: '/search', label: 'Unified search' },
  { href: '/topics', label: 'Topic taxonomy' },
  { href: '/sources', label: 'Canonical sources' },
  { href: '/evidence', label: 'Evidence registry' },
  { href: '/claims', label: 'Structured claims' },
];

const platformLinks = [
  { href: '/reviews', label: 'Formal peer reviews' },
  { href: '/projects', label: 'Research projects' },
  { href: '/tools', label: 'Open-source tools' },
  { href: '/graph', label: 'Provenance graph' },
  { href: '/research-os', label: 'Personal Research OS' },
  { href: '/library', label: 'Research library' },
];

const communityLinks = [
  { href: '/contribute', label: 'Contribute' },
  { href: '/editor', label: 'Scholarly MDX workspace' },
  { href: '/workspaces', label: 'Workspaces' },
  { href: '/', label: 'Editorial archive' },
  { href: '/authors', label: 'Writers' },
  { href: '/assistant', label: 'Assistant' },
];

export default function BlogFooter() {
  return (
    <footer className="mt-8 border-t border-line bg-surface text-ink">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 pt-6 md:grid-cols-2 lg:grid-cols-4">
          <nav aria-labelledby="footer-brand">
            <Text id="footer-brand" as="h2" variant="eyebrow" weight="semibold" className="sr-only">
              ResearchWithMe
            </Text>
            <Link href="/" className="inline-flex items-center gap-1 rounded-sm" aria-label="reme. ResearchWithMe home">
              <BrandLogo size="md" />
            </Link>

            <p className="mt-2 max-w-md font-sans text-xs leading-tight text-ink-secondary">
              An open platform for long-form explanations of published research and open-source code. Articles are written by writers approved by the editor.
            </p>

            <p className="mt-2 font-sans text-xs text-ink-secondary">
              Articles are published under CC BY 4.0.
            </p>
          </nav>

          <nav aria-labelledby="footer-topics">
            <Text id="footer-topics" as="h2" variant="eyebrow" weight="semibold" className="text-xs">
              Topics
            </Text>
            <ul className="mt-2 space-y-1 font-sans text-xs">
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

          <nav aria-labelledby="footer-research">
            <Text id="footer-research" as="h2" variant="eyebrow" weight="semibold" className="text-xs">
              Research
            </Text>
            <ul className="mt-2 space-y-1 font-sans text-xs">
              {researchLinks.map((link) => (
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

          <nav aria-labelledby="footer-platform">
            <Text id="footer-platform" as="h2" variant="eyebrow" weight="semibold" className="text-xs">
              Platform
            </Text>
            <ul className="mt-2 space-y-1 font-sans text-xs">
              {platformLinks.map((link) => (
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

          <nav aria-labelledby="footer-community">
            <Text id="footer-community" as="h2" variant="eyebrow" weight="semibold" className="text-xs">
              Community
            </Text>
            <ul className="mt-2 space-y-1 font-sans text-xs">
              {communityLinks.map((link) => (
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

        <div className="mt-6 flex flex-col gap-2 border-t border-line pt-4 font-sans text-xs text-ink-secondary sm:flex-row sm:items-center sm:justify-between">
          <p>reme. · Edited by Ashif Ahmed Shuvo</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <TextLink href="/settings" variant="quiet">Settings</TextLink>
            <TextLink href="/motion" variant="quiet">
              Motion system
            </TextLink>
          </div>
        </div>
      </div>
    </footer>
  );
}
