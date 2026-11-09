'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bookmark,
  BookOpen,
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
import { readStringArray } from '@/lib/storage';
import BrandLogo from './BrandLogo';
import LocaleSwitcher from './i18n/LocaleSwitcher';

interface BlogHeaderProps {
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  savedCount?: number;
}

const primaryNav = [
  { href: '/', label: 'Articles', icon: BookOpen, match: (path: string) => path === '/' },
  { href: '/papers', label: 'Papers', icon: FileText, match: (path: string) => path.startsWith('/paper') },
  { href: '/authors', label: 'Authors', icon: Users, match: (path: string) => path.startsWith('/author') },
  { href: '/editions', label: 'Editions', icon: BookOpen, match: (path: string) => path.startsWith('/editions') },
  { href: '/assistant', label: 'Assistant', icon: Sparkles, match: (path: string) => path.startsWith('/assistant') },
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
  const { user } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [savedOnDevice, setSavedOnDevice] = useState(0);
  const menuId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenuOpen(false);
    setSavedOnDevice(readStringArray('rwm_saved_posts').length);
  }, [pathname]);

  useEffect(() => {
    function sync() {
      setSavedOnDevice(readStringArray('rwm_saved_posts').length);
    }
    window.addEventListener('storage', sync);
    window.addEventListener('rwm:reading-list-changed', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('rwm:reading-list-changed', sync);
    };
  }, []);

  const savedTotal = savedCount ?? savedOnDevice;

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

  const navLinkClass = (active: boolean) =>
    `inline-flex min-h-10 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-semibold uppercase tracking-wider transition-colors ${
      active
        ? 'border-brand text-stone-900'
        : 'border-transparent text-stone-700 hover:border-stone-400 hover:text-stone-900'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b-4 border-double border-stone-900 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md focus-visible:outline-none"
            aria-label="ResearchWithMe platform home"
          >
            <BrandLogo size="xl" showText={true} />
          </Link>

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-1">
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

          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            {setSearchQuery && (
              <div className="relative hidden 2xl:block">
                <label htmlFor="header-search" className="sr-only">
                  Search articles and repositories
                </label>
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-600"
                  aria-hidden="true"
                />
                <input
                  id="header-search"
                  type="search"
                  value={searchQuery ?? ''}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search articles"
                  className="h-10 w-52 rounded-md border border-stone-300 bg-stone-50 pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-600 focus:bg-white"
                />
              </div>
            )}

            <Link
              href="/bookmarks"
              className="relative hidden min-h-10 items-center gap-1.5 rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-stone-400 hover:bg-stone-50 sm:inline-flex"
            >
              <Bookmark className="h-4 w-4" aria-hidden="true" />
              <span className="hidden xl:inline">Reading list</span>
              <span className="sr-only xl:hidden">Reading list</span>
              {savedTotal > 0 && (
                <span className="rounded-full bg-brand px-1.5 py-0.5 text-xs font-bold text-white">
                  {savedTotal}
                </span>
              )}
            </Link>

            <Link
              href={user ? '/dashboard/access' : '/login'}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-stone-400 hover:bg-stone-50"
              title={user ? `Signed in as ${user.name}` : 'Sign in or create an account'}
            >
              <ShieldCheck className="h-4 w-4 text-brand" aria-hidden="true" />
              <span className="hidden sm:inline">
                {user ? (user.isEditor ? 'Writer' : 'Your account') : 'Sign In'}
              </span>
            </Link>

            <Link
              href={user?.isEditor ? '/write' : '/login?next=%2Fwrite'}
              aria-label={user?.isEditor ? 'Write a review in the writer studio' : 'Sign in to write'}
              className="inline-flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover sm:px-4"
            >
              <PenSquare className="h-4 w-4" aria-hidden="true" />
              <span aria-hidden="true" className="hidden min-[430px]:inline">
                {user?.isEditor ? 'Write' : 'Sign in'}
              </span>
            </Link>

            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls={menuId}
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-stone-300 text-stone-800 transition-colors hover:bg-stone-50 lg:hidden"
            >
              {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
              <span className="sr-only">{menuOpen ? 'Close navigation menu' : 'Open navigation menu'}</span>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div
            ref={menuRef}
            id={menuId}
            className="mb-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm lg:hidden"
          >
            {setSearchQuery && (
              <div className="mb-4">
                <label htmlFor="mobile-search" className="mb-1.5 block text-sm font-medium text-stone-800">
                  Search articles
                </label>
                <input
                  id="mobile-search"
                  type="search"
                  value={searchQuery ?? ''}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Title, author, DOI, or repository"
                  className="h-11 w-full rounded-md border border-stone-300 bg-stone-50 px-3 text-sm text-stone-900 placeholder:text-stone-600 focus:bg-white"
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
                        className={`flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-base font-medium transition-colors ${
                          active ? 'bg-stone-900 text-white' : 'text-stone-800 hover:bg-stone-100'
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

            <nav aria-label="Research tools" className="mt-4 border-t border-stone-200 pt-4">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-stone-900">
                <ChevronDown className="h-4 w-4 text-stone-600" aria-hidden="true" />
                Research tools
              </p>
              <ul className="grid gap-1">
                {secondaryNav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={pathname.startsWith(item.href) ? 'page' : undefined}
                      className="flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-base text-stone-800 transition-colors hover:bg-stone-100"
                    >
                      <item.icon className="h-4 w-4 text-stone-600" aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/write"
                    className="flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-base text-stone-800 transition-colors hover:bg-stone-100"
                  >
                    <PenSquare className="h-4 w-4 text-stone-600" aria-hidden="true" />
                    <span>Writer studio</span>
                  </Link>
                </li>
              </ul>
            </nav>

            <p className="mt-4 flex items-start gap-2 border-t border-stone-200 pt-4 text-sm text-stone-600">
              <User className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {user?.isEditor
                  ? `Signed in as ${user.name}. Publishing permissions are active.`
                  : 'Reader mode. Apply to write to publish reviews.'}
              </span>
            </p>
          </div>
        )}
      </div>
    </header>
  );
}
