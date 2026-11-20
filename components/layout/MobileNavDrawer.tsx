'use client';

import type { RefObject } from 'react';
import Link from 'next/link';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { LogIn, LogOut, PenSquare, User, X } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { EASING } from '@/lib/motion/tokens';

export interface DrawerNavItem {
  href: string;
  label: string;
  icon: typeof PenSquare;
  active: boolean;
}

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
  menuId: string;
  panelRef: RefObject<HTMLDivElement | null>;
  primaryNav: DrawerNavItem[];
  secondaryNav: DrawerNavItem[];
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  isSignedIn: boolean;
  isEditor: boolean;
  userName?: string;
  onSignOut?: () => void;
}

/**
 * Side navigation drawer for phones and tablets.
 *
 * It occupies roughly two-thirds of the viewport and slides in from the right
 * over a dimmed scrim, so the page behind it stays legible and the menu never
 * reads as a full-screen takeover. Rendered as a sibling of the sticky header
 * (never inside it): the header carries `backdrop-filter`, which would turn
 * `position: fixed` into a header-relative box.
 */
export default function MobileNavDrawer({
  open,
  onClose,
  menuId,
  panelRef,
  primaryNav,
  secondaryNav,
  searchQuery,
  setSearchQuery,
  isSignedIn,
  isEditor,
  userName,
  onSignOut,
}: MobileNavDrawerProps) {
  return (
    <AnimatePresence initial={false}>
      {open ? (
        <>
          <m.button
            key="reme-drawer-scrim"
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [...EASING.standard] }}
            className="fixed inset-0 z-40 cursor-default bg-ink/45 backdrop-blur-[2px] lg:hidden"
          />

          <m.div
            key="reme-drawer-panel"
            ref={panelRef}
            id={menuId}
            // BlogHeader moves focus here on open; a div needs tabIndex -1 to take it.
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 42, mass: 0.9 }}
            className="fixed inset-y-0 right-0 z-50 flex outline-none w-[72vw] max-w-[21rem] flex-col overflow-hidden border-l border-line bg-canvas shadow-floating sm:w-[58vw] sm:max-w-[22rem] lg:hidden"
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-3 py-2">
              <Link
                href="/"
                onClick={onClose}
                className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                aria-label="reme. ResearchWithMe home"
              >
                <BrandLogo size="header" />
              </Link>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close navigation menu"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
              {setSearchQuery && (
                <div className="mb-3">
                  <label htmlFor="mobile-search" className="mb-1.5 block font-sans text-xs font-medium text-ink">
                    Search articles
                  </label>
                  <input
                    id="mobile-search"
                    type="search"
                    value={searchQuery ?? ''}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Title, writer, tag, or org/repo"
                    className="h-11 w-full rounded-lg border border-line bg-canvas px-3 font-sans text-sm text-ink placeholder:text-ink-secondary"
                  />
                </div>
              )}

              <nav aria-label="Mobile primary">
                <ul className="grid gap-0.5">
                  {primaryNav.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        aria-current={item.active ? 'page' : undefined}
                        className={`flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 font-sans text-sm font-medium transition-colors ${
                          item.active
                            ? 'bg-brand text-on-primary'
                            : 'text-ink-secondary hover:bg-surface-subtle hover:text-ink'
                        }`}
                      >
                        <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <nav aria-label="Secondary" className="mt-4 border-t border-line pt-3">
                <p className="mb-1.5 px-3 font-mono text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                  Tools
                </p>
                <ul className="grid gap-0.5">
                  {secondaryNav.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        aria-current={item.active ? 'page' : undefined}
                        className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 font-sans text-sm text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink"
                      >
                        <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            <div className="shrink-0 border-t border-line bg-surface px-3 py-3">
              {isSignedIn ? (
                <div className="flex flex-col gap-1">
                  <p className="flex items-center gap-1.5 truncate px-1 text-xs text-ink-secondary">
                    <User className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">
                      Signed in as <span className="font-semibold text-ink">{userName}</span>
                    </span>
                  </p>
                  <p className="px-1 text-xs text-ink-secondary">
                    {isEditor ? 'Editor access is active.' : 'Reader account.'}
                  </p>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <Link
                      href="/dashboard/account"
                      onClick={onClose}
                      className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line px-2 text-xs font-semibold text-ink hover:bg-surface-subtle"
                    >
                      Account
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSignOut?.();
                      }}
                      className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-line px-2 text-xs font-semibold text-ink hover:bg-surface-subtle"
                    >
                      <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                      Sign out
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="px-1 text-xs leading-relaxed text-ink-secondary">
                    Reader mode. Sign in to publish reviews or sync your reading list.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/login"
                      onClick={onClose}
                      className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-line px-2 text-xs font-semibold text-ink hover:bg-surface-subtle"
                    >
                      <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                      Sign in
                    </Link>
                    <Link
                      href="/dashboard/access"
                      onClick={onClose}
                      className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-ink px-2 text-xs font-semibold text-canvas hover:opacity-90"
                    >
                      <PenSquare className="h-3.5 w-3.5" aria-hidden="true" />
                      Write for us
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </m.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
