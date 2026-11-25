'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Monitor, Moon, PenLine, Rss, Search, Sparkles, Sun, Tags, User, X, type LucideIcon } from 'lucide-react';
import {
  applyDocumentTheme,
  normalizeThemePreference,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from '@/lib/theme';
import { NAV, SITE } from '@/lib/site';

/**
 * Mobile menu: a hamburger control that opens a right-side drawer.
 *
 * The drawer is a partial-width panel (max 19rem / 84vw) — never a full-screen
 * takeover — and its items wrap their own content (icon, label, one-line
 * description) instead of a horizontally scrolling strip. On mobile the
 * header keeps only search and this trigger; the theme control and the RSS
 * link live in the drawer. The interaction follows AGENTS.md §12: real
 * `<button>` and `<a>` elements, focus moved into the panel and restored on
 * close, Escape and scrim-click to dismiss, body scroll locked while open,
 * and every animation is a CSS transition that collapses under
 * `prefers-reduced-motion`.
 *
 * The trigger icon is Material Symbols' `view_cozy` (Apache-2.0, embedded
 * inline so no icon font is downloaded — §9 caps font families at two). Each
 * click rotates it a further quarter turn with the emphasize easing, a small
 * dynamic acknowledgment of the toggle; the drawer itself slides with the
 * standard easing.
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

/** Shared row styling so links and the theme button read as one list. */
const itemClass =
  'flex min-h-11 w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left text-ink transition-colors hover:border-line hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

function ItemChip({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-selection text-brand">
      <Icon className="h-4 w-4" aria-hidden="true" />
    </span>
  );
}

function MenuItemLink({ item, onNavigate }: { item: MenuItem; onNavigate: () => void }) {
  return (
    <Link
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

const THEME_ORDER: ThemePreference[] = ['system', 'light', 'dark'];
const THEME_LABEL: Record<ThemePreference, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

/**
 * The drawer's theme row: cycles system → light → dark and applies the choice
 * immediately, mirroring the header control's behaviour through the same
 * `lib/theme` helpers so SSR bootstrap, the desktop button, and this row can
 * never disagree.
 */
function ThemeDrawerItem() {
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setPreference(normalizeThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY)));
    } catch {
      // Storage denial leaves the in-memory choice usable.
    }
    setReady(true);
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        setPreference(normalizeThemePreference(event.newValue));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function cycle() {
    const next = THEME_ORDER[(THEME_ORDER.indexOf(preference) + 1) % THEME_ORDER.length];
    setPreference(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore: the current session can still apply the theme.
    }
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');
    applyDocumentTheme(next, Boolean(query?.matches));
  }

  const Icon = preference === 'light' ? Sun : preference === 'dark' ? Moon : Monitor;

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={ready ? `Switch theme — currently ${THEME_LABEL[preference]}` : 'Switch theme'}
      title={ready ? `Theme: ${THEME_LABEL[preference]}` : 'Switch theme'}
      className={itemClass}
    >
      <ItemChip icon={Icon} />
      <span className="min-w-0">
        <span className="block font-sans text-sm font-semibold leading-tight">Theme</span>
        <span className="block font-sans text-xs leading-snug text-ink-secondary">
          {ready ? `${THEME_LABEL[preference]} — tap to switch` : 'Light, dark, or system'}
        </span>
      </span>
    </button>
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
    // A quarter turn per click: the icon's small dynamic acknowledgment.
    setRotation((value) => value + 90);
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
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink-secondary transition-colors hover:border-brand hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:hidden"
      >
        <span
          aria-hidden="true"
          className="inline-block transition-transform duration-200 ease-emphasize motion-reduce:transition-none"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {/* Material Symbols "view_cozy", Outlined 24px (Apache-2.0, google/material-design-icons). */}
          <svg xmlns="http://www.w3.org/2000/svg" height="22" viewBox="0 -960 960 960" width="22" fill="currentColor">
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
                  <li>
                    <ThemeDrawerItem />
                  </li>
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
