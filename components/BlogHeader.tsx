'use client';

import { useEffect, useId, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, LayoutGroup } from 'motion/react';
import * as m from 'motion/react-m';
import {
  Bookmark,
  BookOpen,
  CheckCircle2,
  Compass,
  FolderKanban,
  GitBranch,
  Library,
  LogIn,
  LogOut,
  PenSquare,
  PlusCircle,
  Search,
  Settings,
  Sparkles,
  Tag,
  User,
  Users,
} from 'lucide-react';
import { useSession } from '@/lib/supabase/use-session';
import { useDigestSubscribed, useSavedTotalCount } from '@/lib/stores/preferences-store';
import { useWarmImport } from '@/lib/motion/hooks';
import { EASING, TRANSITION } from '@/lib/motion/tokens';
import AttentionPulse from './motion/AttentionPulse';
import Pressable from './motion/Pressable';
import BrandLogo from './BrandLogo';
import MobileBottomNav from './layout/MobileBottomNav';
import { Header } from '@/components/ui/header-2';
import { Button } from '@/components/ui/button';
import { MenuToggleIcon } from '@/components/ui/menu-toggle-icon';

const CommandPalette = dynamic(() => import('./search/CommandPalette'), { ssr: false });

interface BlogHeaderProps {
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  savedCount?: number;
}

const primaryNav = [
  { href: '/feed', label: 'Feed', icon: Compass, match: (path: string) => path.startsWith('/feed') || path.startsWith('/contribution/') || path.startsWith('/source/') },
  { href: '/workspaces', label: 'Workspaces', icon: FolderKanban, match: (path: string) => path.startsWith('/workspaces') },
  { href: '/graph', label: 'Graph', icon: GitBranch, match: (path: string) => path.startsWith('/graph') },
  { href: '/', label: 'Home', icon: BookOpen, match: (path: string) => path === '/' || path.startsWith('/articles') || path.startsWith('/post/') || path.startsWith('/category/') },
  { href: '/library', label: 'Library', icon: Library, match: (path: string) => path.startsWith('/library') },
  { href: '/authors', label: 'Writers', icon: Users, match: (path: string) => path.startsWith('/author') || path.startsWith('/profile/') },
  { href: '/assistant', label: 'Assistant', icon: Sparkles, match: (path: string) => path.startsWith('/assistant') },
  { href: '/pricing', label: 'Products', icon: Tag, match: (path: string) => path.startsWith('/pricing') },
];

export default function BlogHeader({ searchQuery, setSearchQuery, savedCount }: BlogHeaderProps) {
  const pathname = usePathname() || '/';
  const { user, signOut } = useSession();
  const storeSavedCount = useSavedTotalCount();
  const digestSubscribed = useDigestSubscribed();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnnouncement, setMenuAnnouncement] = useState('');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteEverOpened, setPaletteEverOpened] = useState(false);
  const [badgePulse, setBadgePulse] = useState(false);
  const menuId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const prevMenuOpenRef = useRef(false);

  const savedTotal = savedCount ?? storeSavedCount;
  const warmPalette = useWarmImport(() => import('./search/CommandPalette'));
  const isEditor = Boolean(user?.isEditor);
  const isSignedIn = Boolean(user);

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
    if (prevMenuOpenRef.current !== menuOpen) {
      setMenuAnnouncement(menuOpen ? 'Navigation menu opened' : 'Navigation menu closed');
      prevMenuOpenRef.current = menuOpen;
    }

    const mainEl = typeof document !== 'undefined' ? document.getElementById('main-content') : null;
    if (!menuOpen) {
      mainEl?.removeAttribute('inert');
      return;
    }

    // Make background content inert while mobile navigation drawer is open (Part II)
    mainEl?.setAttribute('inert', '');

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key === 'Tab' && menuRef.current) {
        const focusables = Array.from(
          menuRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        );
        const toggleBtn = menuButtonRef.current;
        const ring = toggleBtn ? [toggleBtn, ...focusables] : focusables;
        if (ring.length === 0) return;
        const first = ring[0];
        const last = ring[ring.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      mainEl?.removeAttribute('inert');
    };
  }, [menuOpen]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = () => { if (desktop.matches) setMenuOpen(false); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  function openPalette() {
    setPaletteEverOpened(true);
    setPaletteOpen(true);
  }

  const secondaryNav = [
    { href: '/research-os', label: 'Research OS', icon: Sparkles },
    { href: '/editor', label: 'MDX Workspace', icon: PenSquare },
    { href: '/projects', label: 'Projects', icon: FolderKanban },
    { href: '/sources', label: 'Sources', icon: BookOpen },
    { href: '/evidence', label: 'Evidence', icon: CheckCircle2 },
    { href: '/claims', label: 'Claims', icon: Compass },
    { href: '/reviews', label: 'Peer Reviews', icon: User },
    { href: '/tools', label: 'Tool Registry', icon: FolderKanban },
    { href: '/bookmarks', label: 'Reading list', icon: Bookmark },
    { href: '/cite', label: 'Cite', icon: Bookmark },
    { href: '/settings', label: 'Settings', icon: Settings },
    { href: '/editorial-board', label: 'Editor', icon: User },
    { href: isEditor ? '/write' : '/dashboard/access', label: isEditor ? 'Writer studio' : 'Write for us', icon: PenSquare },
  ];

  const navLinkClass = (active: boolean) =>
    `inline-flex min-h-11 items-center gap-1.5 border-b-2 px-3 py-2 font-sans text-sm font-medium transition-colors ${
      active
        ? 'border-brand text-ink'
        : 'border-transparent text-ink-secondary hover:border-line hover:text-ink'
    }`;

  return (
    <>
    <span role="status" aria-live="polite" className="sr-only">
      {menuAnnouncement}
    </span>
    <Header open={menuOpen}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[60px] items-center justify-between gap-1 sm:gap-3">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            aria-label="reme. ResearchWithMe home"
          >
                      <BrandLogo size="header" />
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
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              aria-label="Search articles and writers (⌘K)"
            >
              <Search className="h-5 w-5 shrink-0" aria-hidden="true" />
            </Pressable>

            <Link
              href="/bookmarks"
              className="relative hidden min-h-11 min-w-11 items-center justify-center gap-1 rounded-full text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:inline-flex"
              title={digestSubscribed ? 'Weekly digest subscribed' : 'Reading list'}
              aria-label={digestSubscribed ? 'Reading list — weekly digest subscribed' : 'Reading list'}
            >
              <Bookmark className="h-4 w-4 text-ink-secondary" aria-hidden="true" />
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

            {/* Auth / Contribute CTA — adapts cleanly to three states */}
            {isSignedIn ? (
              <div className="hidden items-center gap-1 md:flex">
                <Link
                  href="/contribute"
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-brand px-4 py-1.5 font-sans text-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
                >
                  <PlusCircle className="h-4 w-4" aria-hidden="true" />
                  <span>Contribute</span>
                </Link>
                <Link
                  href="/dashboard/account"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 font-sans text-sm font-medium text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  title={`Signed in as ${user?.name ?? 'a reader'}`}
                  aria-label="Your account"
                >
                  <User className="h-4 w-4 text-brand" aria-hidden="true" />
                  <span className="hidden xl:inline">Account</span>
                </Link>
                {isEditor && (
                  <Link
                    href="/write"
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-ink px-4 py-1.5 font-sans text-sm font-medium text-canvas transition-opacity hover:opacity-90"
                  >
                    <PenSquare className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Write</span>
                  </Link>
                )}
                <Pressable
                  type="button"
                  onClick={() => signOut?.()}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
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
                  aria-label="Sign in"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 font-sans text-sm font-medium text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <LogIn className="h-4 w-4 text-brand" aria-hidden="true" />
                  <span className="hidden xl:inline">Sign in</span>
                </Link>
                <Link
                  href="/contribute"
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-ink px-4 py-1.5 font-sans text-sm font-medium text-canvas transition-opacity hover:opacity-90"
                >
                  <PlusCircle className="h-4 w-4" aria-hidden="true" />
                  <span>Contribute</span>
                </Link>
              </div>
            )}

            <Button
              ref={menuButtonRef}
              size="icon"
              variant="ghost"
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls={menuId}
              className="rounded-full lg:hidden"
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
                  <MenuToggleIcon open={menuOpen} className="h-5 w-5" />
                </m.span>
              </AnimatePresence>
            </Button>
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
              className="max-h-[calc(100dvh-60px)] overflow-y-auto overscroll-contain lg:hidden"
            >
              <div className="mb-4 border-t border-line bg-canvas py-4">
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
                            onClick={() => setMenuOpen(false)}
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
                          onClick={() => setMenuOpen(false)}
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
                      <Link href="/dashboard/account" onClick={() => setMenuOpen(false)} className="mt-2 flex min-h-11 items-center text-brand underline-offset-4 hover:underline">
                        Your account
                      </Link>
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
                          aria-label="Sign in"
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
    </Header>
    <MobileBottomNav profileHref={isSignedIn ? '/dashboard/account' : '/profile/myself-aas'} />
    </>
  );
}
