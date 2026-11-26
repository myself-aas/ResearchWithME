import Link from 'next/link';
import { Rss, Search } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { ThemeSwitchCompact } from '@/components/library/ThemeSwitch';
import MobileMenu from './MobileMenu';
import { NAV, SITE } from '@/lib/site';

/**
 * Site chrome: brand, primary navigation (inline from `sm` up), and the
 * control cluster. On mobile the cluster is search + the view_cozy trigger
 * that opens the right-side drawer (which carries the theme control and RSS
 * along with the nav); from `sm` up the feed and theme buttons sit in the
 * header beside the inline navigation.
 *
 * Rendered on the server; the interactive islands are the theme button and
 * the mobile menu.
 */
export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-6 lg:px-8">
        <Link href="/" aria-label={`${SITE.name} — home`} className="rounded-sm">
          <BrandLogo size="md" />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 sm:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-2 font-sans text-sm font-medium text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <Link
            href="/search"
            aria-label="Search posts"
            className="inline-flex h-10 w-10 items-center justify-center text-ink-secondary transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:hidden"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href={SITE.feedPath}
            aria-label="RSS feed"
            className="hidden h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink-secondary transition-colors hover:border-brand hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:inline-flex"
          >
            <Rss className="h-4 w-4" aria-hidden="true" />
          </Link>
          <ThemeSwitchCompact />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
