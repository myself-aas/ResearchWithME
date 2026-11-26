'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { FlaskConical, PenLine, Rss, Tags, User, X, type LucideIcon } from 'lucide-react';
import { ThemeSwitchControl } from '@/components/library/ThemeSwitch';
import BrandLogo from '@/components/BrandLogo';
import { SITE } from '@/lib/site';

/**
 * Mobile menu: a bare `40×40px` trigger that opens a right-side drawer.
 *
 * The drawer is a partial-width panel (`w-[min(19rem,84vw)]`) — never a
 * full-screen takeover — portaled to `document.body`. Its header carries the
 * "reme." wordmark (`BrandLogo` at `sm` size), the narrowed destinations
 * (`Writing`, `Topics`, `Lab`, `About`, `RSS`), and the generative
 * `ThemeSwitchControl` segmented radiogroup (`System` / `Light` / `Dark`).
 *
 * The interaction follows AGENTS.md §12: real `<button>` and `<a>` elements,
 * focus moved into the panel on open and restored on close, Tab cycled inside
 * the panel, Escape and scrim-click to dismiss, body scroll locked while open,
 * and every animation is a CSS transition that collapses under
 * `prefers-reduced-motion`.
 *
 * The trigger icon is Material Symbols' `view_cozy` (Outlined 24px geometry,
 * Apache-2.0, embedded inline so no icon font is downloaded — §9 caps font
 * families at two).
 */

interface MenuItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Feed links are plain documents, not router pages. */
  external?: boolean;
}

const GROUPS: Array<{ caption: string; items: MenuItem[] }> = [
  {
    caption: 'Explore',
    items: [
      {
        href: '/blog',
        label: 'Writing',
        description: 'Essays and repository teardowns',
        icon: PenLine,
      },
      {
        href: '/tags',
        label: 'Topics',
        description: 'Browse the archive by topic',
        icon: Tags,
      },
      {
        href: '/lab',
        label: 'Lab',
        description: 'Interactive figures, live with their data',
        icon: FlaskConical,
      },
    ],
  },
  {
    caption: 'Elsewhere',
    items: [
      {
        href: '/about',
        label: 'About',
        description: 'The person behind the site',
        icon: User,
      },
      {
        href: SITE.feedPath,
        label: 'RSS',
        description: 'Subscribe to the feed',
        icon: Rss,
        external: true,
      },
    ],
  },
];

/** Shared row styling so links read as one accessible vertical list (`min-h-11`). */
const itemClass =
  'flex min-h-11 w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left text-ink transition-colors duration-200 ease-standard hover:border-line hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none';

function ItemChip({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-selection text-brand">
      <Icon className="h-4 w-4" aria-hidden="true" />
    </span>
  );
}

function MenuItemLink({
  item,
  onNavigate,
  linkRef,
}: {
  item: MenuItem;
  onNavigate: () => void;
  linkRef?: React.Ref<HTMLAnchorElement>;
}) {
  return (
    <Link
      ref={linkRef}
      href={item.href}
      onClick={onNavigate}
      {...(item.external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
      className={itemClass}
    >
      <ItemChip icon={item.icon} />
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
  const [rotation, setRotation] = useState(0);
  const [mounted, setMounted] = useState(false);
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

  function toggle() {
    setOpen((value) => !value);
    const reduced =
      typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    if (!reduced) {
      // A quarter turn per click: dynamic acknowledgment when motion is permitted.
      setRotation((value) => value + 90);
    }
  }

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

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        {...(mounted ? { 'aria-controls': 'mobile-menu' } : {})}
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="inline-flex h-11 min-h-11 w-11 items-center justify-center text-ink-secondary transition-colors duration-200 ease-standard hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none sm:hidden"
      >
        <span
          aria-hidden="true"
          className="inline-block transition-transform duration-200 ease-emphasize motion-reduce:!transform-none motion-reduce:transition-none"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {/* Material Symbols "view_cozy", Outlined 24px (Apache-2.0, google/material-design-icons). */}
          <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor">
            <path d="M340-540H200q-33 0-56.5-23.5T120-620v-140q0-33 23.5-56.5T200-840h140q33 0 56.5 23.5T420-760v140q0 33-23.5 56.5T340-540Zm-140-80h140v-140H200v140Zm140 500H200q-33 0-56.5-23.5T120-200v-140q0-33 23.5-56.5T200-420h140q33 0 56.5 23.5T420-340v140q0 33-23.5 56.5T340-120Zm-140-80h140v-140H200v140Zm560-340H620q-33 0-56.5-23.5T540-620v-140q0-33 23.5-56.5T620-840h140q33 0 56.5 23.5T840-760v140q0 33-23.5 56.5T760-540Zm-140-80h140v-140H620v140Zm140 500H620q-33 0-56.5-23.5T540-200v-140q0-33 23.5-56.5T620-420h140q33 0 56.5 23.5T840-340v140q0 33-23.5 56.5T760-120Zm-140-80h140v-140H620v140ZM340-620Zm0 280Zm280-280Zm0 280Z" />
          </svg>
        </span>
      </button>

      {mounted &&
        createPortal(
          <>
            <div
              aria-hidden="true"
              onClick={close}
              className={`fixed inset-0 z-40 bg-surface-inverse/45 transition-opacity duration-200 ease-standard motion-reduce:transition-none ${
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
              <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                <BrandLogo size="sm" />
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close menu"
                  className="inline-flex h-11 min-h-11 w-11 min-w-11 items-center justify-center rounded-full border border-line bg-canvas text-ink-secondary transition-colors duration-200 ease-standard hover:border-brand hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <nav aria-label="Primary mobile" className="flex-1 overflow-y-auto p-3">
                {GROUPS.map((group, groupIndex) => (
                  <div key={group.caption} className="mt-2 first:mt-0">
                    <p className="px-3 pb-1 pt-3 font-mono text-[0.6875rem] font-semibold uppercase tracking-wider text-ink-secondary first:pt-1">
                      {group.caption}
                    </p>
                    <ul className="flex flex-col gap-1">
                      {group.items.map((item, itemIndex) => (
                        <li key={item.href}>
                          <MenuItemLink
                            item={item}
                            onNavigate={close}
                            linkRef={groupIndex === 0 && itemIndex === 0 ? firstLinkRef : undefined}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                <p className="px-3 pb-1 pt-4 font-mono text-[0.6875rem] font-semibold uppercase tracking-wider text-ink-secondary">
                  Appearance
                </p>
                <div className="rounded-xl border border-transparent px-3 py-2.5 transition-colors duration-200 ease-standard hover:border-line hover:bg-surface-subtle motion-reduce:transition-none">
                  <ThemeSwitchControl />
                </div>
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
