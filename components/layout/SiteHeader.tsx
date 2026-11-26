import Link from 'next/link';
import { Search } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { ThemeSwitchCompact } from '@/components/library/ThemeSwitch';
import MobileMenu from './MobileMenu';
import { NAV, SITE } from '@/lib/site';

/**
 * Site chrome: brand wordmark, three-destination primary navigation (inline
 * from `sm` up: Writing, Topics, Lab), and the right utility cluster.
 *
 * - Mobile (`<sm`): 56px (`h-14`) bar with `BrandLogo` (`1.75rem`) on the left
 *   and ONLY two bare `40×40px` icon triggers on the right (Search + `view_cozy`
 *   drawer trigger, `gap-1` = `84px` cluster, zero border/surface chrome).
 * - Tablet & Desktop (`sm:` up): 64px (`sm:h-16`) bar with `BrandLogo` (`2rem`),
 *   three primary nav links (`min-h-11`), and two `44×44px` compact utility
 *   controls (Search + `ThemeSwitchCompact`).
 *
 * Rendered on the server; the interactive islands are the theme button and
 * the mobile menu.
 */
export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:h-16 md:px-6 lg:px-8">
        <Link
          href="/"
          aria-label={`${SITE.name} — home`}
          className="inline-flex min-h-10 items-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:min-h-11"
        >
          <BrandLogo size="header" />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 sm:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex min-h-11 items-center rounded-full px-3.5 font-sans text-sm font-medium text-ink-secondary transition-colors duration-200 ease-standard hover:bg-surface-subtle hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/search"
            aria-label="Search"
            className="inline-flex h-10 min-h-10 w-10 items-center justify-center text-ink-secondary transition-colors duration-200 ease-standard hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none sm:h-11 sm:min-h-11 sm:w-11 sm:min-w-11 sm:rounded-full sm:border sm:border-line sm:bg-surface sm:hover:border-brand"
          >
            <Search className="h-5 w-5 sm:h-4 sm:w-4" aria-hidden="true" />
          </Link>
          <ThemeSwitchCompact className="hidden sm:inline-flex" />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
