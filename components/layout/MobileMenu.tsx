'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { PenLine, Rss, Search, Sparkles, Tags, User, X, type LucideIcon } from 'lucide-react';
import { NAV, SITE } from '@/lib/site';

/**
 * Mobile menu: a hamburger control that opens a right-side drawer.
 *
 * The drawer is a partial-width panel (max 19rem / 84vw) — never a full-screen
 * takeover — and its items wrap their own content (icon, label, one-line
 * description) instead of a horizontally scrolling strip. The interaction
 * follows AGENTS.md §12: real `<button>` and `<a>` elements, focus moved into
 * the panel and restored on close, Escape and scrim-click to dismiss, body
 * scroll locked while open, and every animation is a CSS transition that
 * collapses under `prefers-reduced-motion`.
 *
 * The panel renders through a portal to `document.body`: the sticky header
 * carries `backdrop-blur-md`, which makes it the containing block for any
 * `position: fixed` descendant — a drawer inside the header would be trapped
 * in the header's box instead of spanning the viewport.
 */

interface MenuItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Feed links are plain documents, not router pages. */
  external?: boolean;
}

const MENU_ICONS: Record<string, LucideIcon> = {
  '/blog': PenLine,
  '/tags': Tags,
  '/assistant': Sparkles,
  '/about': User,
  '/search': Search,
};

const MENU_DESCRIPTIONS: Record<string, string> = {
  '/blog': 'Essays and repository teardowns',
  '/tags': 'Browse the archive by topic',
  '/assistant': 'Ask the archive, get quotes',
  '/about': 'The person behind the site',
  '/search': 'Full-text index of every essay',
};

const ITEMS: MenuItem[] = [
  ...NAV.map((item) => ({
    href: item.href,
    label: item.label,
    description: MENU_DESCRIPTIONS[item.href] ?? '',
    icon: MENU_ICONS[item.href] ?? PenLine,
  })),
  { href: SITE.feedPath, label: 'RSS', description: 'Subscribe to the feed', icon: Rss, external: true },
];

function MenuItemLink({ item, onNavigate }: { item: MenuItem; onNavigate: () => void }) {
  const Icon = item.icon;
  const isFeed = item.external;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      {...(isFeed ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
      className="flex min-h-11 items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-ink transition-colors hover:border-line hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-selection text-brand">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block font-sans text-sm font-semibold leading-tight">{item.label}</span>
        <span className="block font-sans text-xs leading-snug text-ink-secondary">
          {item.description}
        </span>
      </span>
    </Link>
  );
}

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  // Any navigation closes the drawer; the reader should land on the page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    firstLinkRef.current?.focus();

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus();
    };
  }, [open]);

  const close = () => setOpen(false);

  // Keep Tab cycling inside the open panel.
  function trapTab(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab' || !panelRef.current) return;
    const focusable = panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const hamburgerLine =
    'absolute left-0 h-[2px] w-5 rounded-full bg-current transition-[transform,opacity] duration-200 ease-standard motion-reduce:transition-none';

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        {...(mounted ? { 'aria-controls': 'mobile-menu' } : {})}
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink-secondary transition-colors hover:border-brand hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:hidden"
      >
        <span className="relative block h-4 w-5" aria-hidden="true">
          <span
            className={`${hamburgerLine} top-0.5 ${open ? 'translate-y-[5px] rotate-45' : ''}`}
          />
          <span
            className={`${hamburgerLine} top-[7px] ${open ? 'opacity-0' : ''}`}
          />
          <span
            className={`${hamburgerLine} top-[13px] ${open ? '-translate-y-[5px] -rotate-45' : ''}`}
          />
        </span>
      </button>

      {mounted &&
        createPortal(
          <>
            <div
              aria-hidden="true"
              onClick={close}
              className={`fixed inset-0 z-40 bg-surface-inverse/45 backdrop-blur-[2px] transition-opacity duration-200 ease-standard motion-reduce:transition-none ${
                open ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
            />
            <div
              ref={panelRef}
              id="mobile-menu"
              role="dialog"
              aria-modal="true"
              aria-label="Site menu"
              onKeyDown={trapTab}
              className={`fixed inset-y-0 right-0 z-50 flex w-[min(19rem,84vw)] flex-col border-l border-line bg-surface shadow-dialog transition-[transform,visibility] duration-200 ease-standard motion-reduce:transition-none ${
                open ? 'visible translate-x-0' : 'invisible translate-x-full'
              }`}
            >
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <p className="font-mono text-[0.6875rem] font-semibold uppercase tracking-wider text-ink">
                  Menu
                </p>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close menu"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-canvas text-ink-secondary transition-colors hover:border-brand hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <nav aria-label="Primary mobile" className="flex-1 overflow-y-auto p-3">
                <ul className="flex flex-col gap-1">
                  {ITEMS.map((item) => (
                    <li key={item.href}>
                      <MenuItemLink item={item} onNavigate={close} />
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="border-t border-line px-4 py-3">
                <p className="font-serif text-sm italic text-ink-secondary">{SITE.tagline}</p>
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
