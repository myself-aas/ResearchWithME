'use client';

import { useEffect, useId, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, LayoutGroup, useMotionValueEvent, useScroll } from 'motion/react';
import * as m from 'motion/react-m';
import {
  Bookmark,
  BookOpen,
  CheckCircle2,
  LogIn,
  LogOut,
  Menu,
  PenSquare,
  Search,
  Sparkles,
  Tag,
  User,
  Users,
  X,
} from 'lucide-react';
import { useSession } from '@/lib/supabase/use-session';
import { useDigestSubscribed, useSavedTotalCount } from '@/lib/stores/preferences-store';
import { useWarmImport } from '@/lib/motion/hooks';
import { EASING, TRANSITION } from '@/lib/motion/tokens';
import AttentionPulse from './motion/AttentionPulse';
import Pressable from './motion/Pressable';
import BrandLogo from './BrandLogo';
import ThemeToggle from './ThemeToggle';

const CommandPalette = dynamic(() => import('./search/CommandPalette'), { ssr: false });

interface BlogHeaderProps {
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  savedCount?: number;
}

const primaryNav = [
  { href: '/', label: 'Home', icon: BookOpen, match: (path: string) => path === '/' || path.startsWith('/articles') || path.startsWith('/post/') || path.startsWith('/category/') },
  { href: '/authors', label: 'Writers', icon: Users, match: (path: string) => path.startsWith('/author') },
  { href: '/assistant', label: 'Assistant', icon: Sparkles, match: (path: string) => path.startsWith('/assistant') },
  { href: '/pricing', label: 'Products', icon: Tag, match: (path: string) => path.startsWith('/pricing') },
];

export default function BlogHeader({ searchQuery, setSearchQuery, savedCount }: BlogHeaderProps) {
  const pathname = usePathname() || '/';
  const { user, signOut } = useSession();
  const storeSavedCount = useSavedTotalCount();
  const digestSubscribed = useDigestSubscribed();
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteEverOpened, setPaletteEverOpened] = useState(false);
  const [elevated, setElevated] = useState(false);
  const [badgePulse, setBadgePulse] = useState(false);
  const menuId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const savedTotal = savedCount ?? storeSavedCount;
  const warmPalette = useWarmImport(() => import('./search/CommandPalette'));
  const { scrollY } = useScroll();
  const isEditor = Boolean(user?.isEditor);
  const isSignedIn = Boolean(user);

  useMotionValueEvent(scrollY, 'change', (value) => {
    setElevated(value > 8);
  });

  useEffect(() => {
    if (savedTotal <= 0) return;
    setBadgePulse(true);
    const timer = window.setTimeout(() => setBadgePulse(false), 3400);
    return () => window.clearTimeout(timer);
  }, [savedTotal]);

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

  const secondaryNav = [
    { href: '/bookmarks', label: 'Reading list', icon: Bookmark },
    { href: '/cite', label: 'Cite', icon: Bookmark },
    { href: '/editorial-board', label: 'Editor', icon: User },
    { href: isEditor ? '/write' : '/dashboard/access', label: isEditor ? 'Writer studio' : 'Write for us', icon: PenSquare },
  ];

  const navLinkClass = (active: boolean) =>
    `inline-flex min-h-11 items-center gap-1.5 border-b-2 px-3 py-2 font-sans text-xs font-semibold uppercase tracking-wider transition-colors ${
      active
        ? 'border-brand text-ink'
        : 'border-transparent text-ink-secondary hover:border-line hover:text-ink'
    }`;

  return (
    <header
      className={`sticky top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur-xs transition-shadow duration-200 ${
        elevated ? 'shadow-floating' : 'shadow-none'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 items-center justify-between gap-1.5 sm:gap-3">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 rounded-sm focus-visible:outline-none"
            aria-label="ResearchWithMe home"
          >
            <BrandLogo size="xl" showText={true} />
          </Link>

          <nav aria-label="Primary" className="hidden lg:block">
            <LayoutGroup id="reme-primary-nav">
              <ul className="flex items-center gap-0.5">
                {primaryNav.map((item) => {
                  const active = item.match(pathname);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={`${navLinkClass(active)} relative`}
                      >
                        <span>{item.label}</span>
                        {active ? (
                          <m.span
                            layoutId="reme-nav-underline"
                            aria-hidden="true"
                            className="absolute inset-x-2 -bottom-[2px] h-0.5 rounded-full bg-ink"
                            transition={{ layout: TRANSITION.reveal }}
                          />
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </LayoutGroup>
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <Pressable
              type="button"
              onClick={openPalette}
              {...warmPalette}
              className="inline-flex min-h-11 items-center gap-2.5 rounded-sm border border-line bg-surface px-2.5 py-1.5 font-sans text-xs text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink sm:px-3"
              aria-label="Search articles and writers (⌘K)"
            >
              <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="sr-only xl:not-sr-only">Search articles and writers</span>
              <kbd className="hidden rounded-sm border border-line bg-canvas px-1.5 py-0.5 font-mono text-xs font-medium text-ink-secondary sm:inline-block">
                ⌘K
              </kbd>
            </Pressable>

            <Link
              href="/bookmarks"
              className="relative hidden min-h-11 items-center gap-1.5 rounded-sm border border-line bg-surface px-2.5 py-1.5 font-sans text-xs font-medium text-ink transition-colors hover:bg-surface-subtle sm:inline-flex"
              title={digestSubscribed ? 'Weekly digest subscribed' : 'Reading list'}
              aria-label={digestSubscribed ? 'Reading list — weekly digest subscribed' : 'Reading list'}
            >
              <Bookmark className="h-4 w-4 text-ink-secondary" aria-hidden="true" />
              <span className="hidden 2xl:inline">Reading list</span>
              <span className="sr-only 2xl:hidden">Reading list</span>
              {savedTotal > 0 && (
                <AttentionPulse active={badgePulse} className="rounded-sm">
                  <span className="rounded-sm bg-brand px-1.5 py-0.5 font-mono text-xs font-semibold text-on-primary">
                    {savedTotal}
                  </span>
                </AttentionPulse>
              )}
              {digestSubscribed && (
                <CheckCircle2 className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
              )}
            </Link>

            <ThemeToggle />

            {/* Auth / Write CTA — adapts cleanly to three states */}
            {isSignedIn ? (
              <div className="hidden items-center gap-1 md:flex">
                <Link
                  href={isEditor ? '/write' : '/dashboard'}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-line bg-surface px-2.5 py-1.5 font-sans text-xs font-medium text-ink transition-colors hover:bg-surface-subtle"
                  title={`Signed in as ${user?.name ?? 'a reader'}`}
                  aria-label={isEditor ? 'Open writer studio' : 'Your account'}
                >
                  <User className="h-4 w-4 text-brand" aria-hidden="true" />
                  <span className="hidden xl:inline">{isEditor ? 'Studio' : 'Account'}</span>
                </Link>
                {isEditor && (
                  <Link
                    href="/write"
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm bg-ink px-3 py-1.5 font-sans text-xs font-semibold text-canvas transition-opacity hover:opacity-90"
                  >
                    <PenSquare className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Write</span>
                  </Link>
                )}
                <Pressable
                  type="button"
                  onClick={() => signOut?.()}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-line bg-surface text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                </Pressable>
              </div>
            ) : (
              <div className="hidden items-center gap-1 md:flex">
                <Link
                  href="/login"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-line bg-surface px-2.5 py-1.5 font-sans text-xs font-medium text-ink transition-colors hover:bg-surface-subtle"
                >
                  <LogIn className="h-4 w-4 text-brand" aria-hidden="true" />
                  <span className="hidden xl:inline">Sign in</span>
                </Link>
                <Link
                  href="/dashboard/access"
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm bg-ink px-3 py-1.5 font-sans text-xs font-semibold text-canvas transition-opacity hover:opacity-90"
                >
                  <PenSquare className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Write for us</span>
                </Link>
              </div>
            )}

            <Pressable
              ref={menuButtonRef}
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls={menuId}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-line bg-surface text-ink transition-colors hover:bg-surface-subtle lg:hidden"
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              <AnimatePresence initial={false} mode="wait">
                <m.span
                  key={menuOpen ? 'close' : 'open'}
                  initial={{ rotate: -35, opacity: 0, scale: 0.8 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: 35, opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.16, ease: [...EASING.enter] }}
                  className="inline-flex"
                >
                  {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
                </m.span>
              </AnimatePresence>
            </Pressable>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {menuOpen ? (
            <m.div
              key="reme-mobile-menu"
              ref={menuRef}
              id={menuId}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [...EASING.standard] }}
              className="overflow-hidden lg:hidden"
            >
              <div className="mb-4 rounded-sm border border-line bg-surface p-5">
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
                      placeholder="Title, writer, tag, or org/repo"
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

                <nav aria-label="Secondary" className="mt-4 border-t border-line pt-4">
                  <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-wider text-ink">Tools</p>
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
                  </ul>
                </nav>

                <div className="mt-4 flex items-start gap-2 border-t border-line pt-4 font-sans text-xs text-ink-secondary">
                  <User className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {isSignedIn ? (
                    <div className="flex-1">
                      <p className="text-ink">
                        Signed in as <span className="font-semibold">{user?.name}</span>.
                      </p>
                      <p className="mt-1">
                        {isEditor
                          ? 'Publishing permissions are active.'
                          : 'Reader mode. Apply to write to publish reviews.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => signOut?.()}
                        className="mt-2 inline-flex items-center gap-1 text-brand underline-offset-4 hover:underline"
                      >
                        <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                        Sign out
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <p>Reader mode. Sign in to publish reviews or save to a synced reading list.</p>
                      <div className="mt-2 flex gap-2">
                        <Link
                          href="/login"
                          className="inline-flex min-h-9 items-center gap-1 rounded-sm border border-line bg-canvas px-2.5 py-1.5 text-ink hover:bg-surface-subtle"
                        >
                          <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                          Sign in
                        </Link>
                        <Link
                          href="/dashboard/access"
                          className="inline-flex min-h-9 items-center gap-1 rounded-sm bg-ink px-2.5 py-1.5 font-semibold text-canvas hover:opacity-90"
                        >
                          <PenSquare className="h-3.5 w-3.5" aria-hidden="true" />
                          Write for us
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </m.div>
          ) : null}
        </AnimatePresence>
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
