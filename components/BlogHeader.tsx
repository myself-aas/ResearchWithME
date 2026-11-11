'use client';

import { useEffect, useId, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bookmark,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  FileText,
  Menu,
  PenSquare,
  Quote,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  X,
} from 'lucide-react';
import { useSession } from '@/lib/supabase/use-session';
import { useDigestSubscribed, useSavedTotalCount } from '@/lib/stores/preferences-store';
import { t } from '@/lib/i18n';
import BrandLogo from './BrandLogo';
import LocaleSwitcher from './i18n/LocaleSwitcher';
import { useLocale } from './i18n/LocaleProvider';
import ThemeToggle from './ThemeToggle';

const CommandPalette = dynamic(() => import('./search/CommandPalette'), { ssr: false });

interface BlogHeaderProps {
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  savedCount?: number;
}

const primaryNav = [
  { href: '/', label: 'Index', icon: BookOpen, match: (path: string) => path === '/' || path === '/articles' },
  { href: '/papers', label: 'Papers', icon: FileText, match: (path: string) => path.startsWith('/paper') },
  { href: '/authors', label: 'Specialists', icon: Users, match: (path: string) => path.startsWith('/author') },
  { href: '/editions', label: 'Editions', icon: BookOpen, match: (path: string) => path.startsWith('/editions') },
  { href: '/assistant', label: 'Synthesis', icon: Sparkles, match: (path: string) => path.startsWith('/assistant') },
];

const secondaryNav = [
  { href: '/bookmarks', label: 'Reading list', icon: Bookmark },
  { href: '/cite', label: 'Citation builder', icon: Quote },
  { href: '/editorial-board', label: 'Editorial board', icon: Users },
  { href: '/dashboard/access', label: 'Apply to write', icon: ShieldCheck },
  { href: '/dashboard', label: 'Editorial studio', icon: PenSquare },
];

export default function BlogHeader({ searchQuery, setSearchQuery, savedCount }: BlogHeaderProps) {
  const pathname = usePathname() || '/';
  const { locale } = useLocale();
  const { user } = useSession();
  const storeSavedCount = useSavedTotalCount();
  const digestSubscribed = useDigestSubscribed();
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteEverOpened, setPaletteEverOpened] = useState(false);
  const menuId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const savedTotal = savedCount ?? storeSavedCount;

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleGlobalKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteEverOpened(true);
        setPaletteOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  function openPalette() {
    setPaletteEverOpened(true);
    setPaletteOpen(true);
  }

  const navLinkClass = (active: boolean) =>
    `inline-flex min-h-11 items-center gap-1.5 border-b-2 px-3 py-2 font-sans text-xs font-semibold uppercase tracking-wider transition-colors ${
      active
        ? 'border-brand text-ink'
        : 'border-transparent text-ink-secondary hover:border-line hover:text-ink'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur-xs">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 items-center justify-between gap-3">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 rounded-sm focus-visible:outline-none"
                      aria-label="𝞹eme — ResearchWithMe platform home"
          >
            <BrandLogo size="xl" showText={true} />
          </Link>

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-0.5">
              {primaryNav.map((item) => {
                const active = item.match(pathname);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={navLinkClass(active)}
                    >
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={openPalette}
              className="inline-flex min-h-11 items-center gap-2.5 rounded-sm border border-line bg-surface px-2.5 py-1.5 font-sans text-xs text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink sm:px-3"
            >
              <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="sr-only xl:not-sr-only">{t(locale, 'cmdk.trigger')}</span>
              <kbd className="hidden rounded-sm border border-line bg-canvas px-1.5 py-0.5 font-mono text-xs font-medium text-ink-secondary sm:inline-block">
                ⌘K
              </kbd>
            </button>

            <Link
              href="/bookmarks"
              className="relative hidden min-h-11 items-center gap-1.5 rounded-sm border border-line bg-surface px-2.5 py-1.5 font-sans text-xs font-medium text-ink transition-colors hover:bg-surface-subtle sm:inline-flex"
              title={digestSubscribed ? t(locale, 'nav.digestSubscribed') : t(locale, 'nav.readingList')}
            >
              <Bookmark className="h-4 w-4 text-ink-secondary" aria-hidden="true" />
              <span className="hidden 2xl:inline">{t(locale, 'nav.readingList')}</span>
              <span className="sr-only 2xl:hidden">{t(locale, 'nav.readingList')}</span>
              {savedTotal > 0 && (
                <span className="rounded-sm bg-brand px-1.5 py-0.5 font-mono text-xs font-semibold text-on-primary">
                  {savedTotal}
                </span>
              )}
              {digestSubscribed && (
                <CheckCircle2
                  className="h-3.5 w-3.5 text-brand"
                  aria-label={t(locale, 'nav.digestSubscribed')}
                />
              )}
            </Link>

            <LocaleSwitcher />
            <ThemeToggle />

            <Link
              href={user ? '/dashboard/access' : '/login'}
              className="hidden min-h-11 items-center gap-1.5 rounded-sm border border-line bg-surface px-2.5 py-1.5 font-sans text-xs font-medium text-ink transition-colors hover:bg-surface-subtle md:inline-flex"
              title={user ? `Signed in as ${user.name}` : 'Sign in or create an account'}
            >
              <ShieldCheck className="h-4 w-4 text-brand" aria-hidden="true" />
              <span className="hidden xl:inline">
                {user ? (user.isEditor ? 'Writer' : 'Account') : 'Sign In'}
              </span>
            </Link>

            <Link
              href={user?.isEditor ? '/write' : '/login?next=%2Fwrite'}
              aria-label={user?.isEditor ? 'Write a review in the writer studio' : 'Sign in to write'}
              className="hidden min-h-11 items-center justify-center gap-1.5 rounded-sm bg-ink px-3 py-1.5 font-sans text-xs font-semibold text-canvas transition-opacity hover:opacity-90 sm:inline-flex"
            >
              <PenSquare className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{user?.isEditor ? 'Write' : 'Sign in'}</span>
            </Link>

            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls={menuId}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-line bg-surface text-ink transition-colors hover:bg-surface-subtle lg:hidden"
            >
              {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
              <span className="sr-only">{menuOpen ? 'Close navigation menu' : 'Open navigation menu'}</span>
            </button>
          </div>
        </div>

        <div
          ref={menuRef}
          id={menuId}
          hidden={!menuOpen}
          className={menuOpen ? 'mb-4 rounded-sm border border-line bg-surface p-4 lg:hidden' : 'hidden'}
        >
          {setSearchQuery && (
            <div className="mb-4">
              <label htmlFor="mobile-search" className="mb-1.5 block font-sans text-xs font-medium text-ink">
                Search articles
              </label>
              <input
                id="mobile-search"
                type="search"
                value={searchQuery ?? ''}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Title, author, DOI, or repository"
                className="h-11 w-full rounded-sm border border-line bg-canvas px-3 font-sans text-sm text-ink placeholder:text-ink-secondary"
              />
            </div>
          )}

          <nav aria-label="Mobile primary">
            <ul className="grid gap-1">
              {primaryNav.map((item) => {
                const active = item.match(pathname);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={`flex min-h-11 items-center gap-2 rounded-sm border px-3 py-2 font-sans text-sm font-medium transition-colors ${
                        active ? 'border-brand bg-surface-subtle text-ink' : 'border-transparent text-ink-secondary hover:bg-surface-subtle hover:text-ink'
                      }`}
                    >
                      <item.icon className="h-4 w-4" aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <nav aria-label="Research tools" className="mt-4 border-t border-line pt-4">
            <p className="mb-2 flex items-center gap-1.5 font-mono text-xs font-medium uppercase tracking-wider text-ink-secondary">
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
              Research tools
            </p>
            <ul className="grid gap-1">
              {secondaryNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={pathname.startsWith(item.href) ? 'page' : undefined}
                    className="flex min-h-11 items-center gap-2 rounded-sm px-3 py-2 font-sans text-sm text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink"
                  >
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/write"
                  className="flex min-h-11 items-center gap-2 rounded-sm px-3 py-2 font-sans text-sm text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink"
                >
                  <PenSquare className="h-4 w-4" aria-hidden="true" />
                  <span>Writer studio</span>
                </Link>
              </li>
            </ul>
          </nav>

          <p className="mt-4 flex items-start gap-2 border-t border-line pt-4 font-sans text-xs text-ink-secondary">
            <User className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {user?.isEditor
                ? `Signed in as ${user.name}. Publishing permissions are active.`
                : 'Reader mode. Apply to write to publish reviews.'}
            </span>
          </p>
        </div>
      </div>

      {paletteEverOpened && (
        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          initialQuery={searchQuery ?? ''}
        />
      )}
    </header>
  );
}
