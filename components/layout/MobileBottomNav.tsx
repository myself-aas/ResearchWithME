'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { Compass, Library, PlusCircle, Sparkles, User, type LucideIcon } from 'lucide-react';
import { SPRING, EASING } from '@/lib/motion/tokens';
import { cn } from '@/lib/utils';
import { useSession } from '@/lib/supabase/use-session';

interface MobileBottomNavProps {
  profileHref?: string;
  /**
   * Honest count of library items added since the reader's last acknowledgement.
   * `null`/`undefined`/`0` renders no badge at all — the Library tab shows a
   * badge only when a real count exists (see the signed-in Library surface).
   */
  newInLibrary?: number | null;
}

/**
 * Mobile Bottom Navigation — Primary mobile destinations:
 *   Explore, Library, Contribute, AI, Profile.
 * Projects, Reviews, Sources, Evidence, Claims, Dashboard sections, and
 * Settings live in the mobile navigation drawer.
 *
 * Premium enhancements:
 * - Spring-based tab switching animations
 * - Expressive icon micro-interactions (scale, rotation, color)
 * - Improved touch targets (56px height)
 * - Active indicator with spring animation
 * - Haptic-like press feedback
 *
 * Auth gate (v3.4): the bar is signed-in chrome — Explore/Library/Contribute/
 * AI/Profile are account destinations, so the nav renders for signed-in users
 * only (which covers writers and editors, the app's authoring roles) and is
 * never emitted for visitors without a session — including the pre-hydration
 * paint, so the bar can never flash for a signed-out visitor. Gating here only
 * mirrors the session for display; every write route still enforces the real
 * permission check server-side.
 *
 * Signed-in chrome in the shadcn idiom (rounded-full press feedback, cn()
 * composition, spring transitions), wired to this app's routing data.
 */
const ITEMS = [
  {
    href: '/feed',
    label: 'Explore',
    icon: Compass,
    match: (p: string) =>
      p === '/' ||
      p.startsWith('/feed') ||
      p.startsWith('/contribution/') ||
      p.startsWith('/source') ||
      p.startsWith('/evidence') ||
      p.startsWith('/claim'),
  },
  {
    href: '/library',
    label: 'Library',
    icon: Library,
    match: (p: string) => p.startsWith('/library') || p.startsWith('/bookmarks'),
  },
  {
    href: '/contribute',
    label: 'Contribute',
    icon: PlusCircle,
    accent: true,
    match: (p: string) => p.startsWith('/contribute'),
  },
  {
    href: '/assistant',
    label: 'AI',
    icon: Sparkles,
    match: (p: string) => p.startsWith('/assistant'),
  },
];

// Custom hook for reduced motion preference
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return reduced;
}

interface BottomNavTabProps {
  href: string;
  label: string;
  icon: LucideIcon;
  index: number;
  active: boolean;
  pressed: boolean;
  accent?: boolean;
  reducedMotion: boolean;
  /** Real unread count for the tab; `null`/undefined renders nothing. */
  badge?: number | null;
  onPressStart: (index: number) => void;
  onPressEnd: () => void;
}

function BottomNavTab({
  href,
  label,
  icon: Icon,
  index,
  active,
  pressed,
  accent = false,
  reducedMotion,
  badge,
  onPressStart,
  onPressEnd,
}: BottomNavTabProps) {
  const badgeCount = typeof badge === 'number' && Number.isFinite(badge) ? Math.floor(badge) : 0;
  const showBadge = badgeCount >= 1;
  const badgeText = badgeCount > 99 ? '99+' : String(badgeCount);
  return (
    <li className="min-w-0" role="presentation">
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        role="tab"
        aria-selected={active}
        aria-label={label}
        onMouseDown={() => onPressStart(index)}
        onMouseUp={onPressEnd}
        onMouseLeave={onPressEnd}
        onTouchStart={() => onPressStart(index)}
        onTouchEnd={onPressEnd}
        className={cn(
          'relative flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 font-sans text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
          accent ? 'text-brand font-semibold' : active ? 'text-ink' : 'text-ink-secondary',
        )}
      >
        {showBadge ? (
          <span
            role="img"
            aria-label={`${label}: ${badgeCount} new since your last visit`}
            className="absolute right-1.5 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 font-sans text-xs font-bold leading-none text-on-primary"
          >
            {badgeText}
          </span>
        ) : null}

        {/* Icon wrapper with spring animations */}
        <AnimatePresence mode="wait">
          <m.span
            key={active.toString()}
            initial={false}
            animate={{
              scale: active ? 1.15 : pressed ? 0.85 : 1,
              rotate: active ? (accent ? 90 : 0) : 0,
            }}
            transition={{
              type: 'spring',
              stiffness: SPRING.expressive.stiffness,
              damping: SPRING.expressive.damping,
              mass: SPRING.expressive.mass,
            }}
            style={{
              willChange: 'transform',
            }}
            className="flex items-center justify-center"
          >
            <Icon
              className={cn('h-6 w-6 transition-colors', accent && 'text-brand')}
              aria-hidden="true"
            />
          </m.span>
        </AnimatePresence>

        <m.span
          initial={false}
          animate={{
            y: active ? -1 : 0,
          }}
          transition={{
            duration: reducedMotion ? 0 : 0.15,
            ease: EASING.enter,
          }}
          className="truncate"
        >
          {label}
        </m.span>

        {/* Active indicator dot */}
        <AnimatePresence mode="wait">
          {active && (
            <m.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{
                type: 'spring',
                stiffness: SPRING.expressive.stiffness,
                damping: SPRING.expressive.damping,
              }}
              className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-brand"
              aria-hidden="true"
            />
          )}
        </AnimatePresence>
      </Link>
    </li>
  );
}

export default function MobileBottomNav({
  profileHref = '/login?next=%2Fdashboard%2Faccount',
  newInLibrary = null,
}: MobileBottomNavProps) {
  const pathname = usePathname() || '/';
  const reducedMotion = useReducedMotion();
  // Signed-in chrome: writers and editors are signed-in users, so a present
  // session is the whole gate — the server still enforces the real permissions.
  const { user, hydrated } = useSession();
  const matchedIndex = ITEMS.findIndex((item) => item.match(pathname));
  const activeIndex = matchedIndex === -1 ? 4 : matchedIndex;
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);

  // Every hook lives above this line; the early returns below are order-safe.

  // Visitors without a session (or before the browser session has hydrated)
  // never see the bar — no protected chrome in the anonymous experience.
  if (!hydrated || !user) {
    return null;
  }

  // Hide inside immersive writing flows so it never competes with editor toolbars (v3.4 Part III §6.1).
  if (
    pathname.startsWith('/contribute') ||
    pathname.startsWith('/editor') ||
    pathname.startsWith('/write') ||
    pathname.startsWith('/dashboard')
  ) {
    return null;
  }

  const profileActive = pathname.startsWith('/profile/') || pathname.startsWith('/author');

  const handlePressStart = (index: number) => {
    if (!reducedMotion) setPressedIndex(index);
  };

  const handlePressEnd = () => {
    if (!reducedMotion) setPressedIndex(null);
  };

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 backdrop-blur-md lg:hidden pb-[env(safe-area-inset-bottom)]"
      role="navigation"
    >
      {/* Active indicator bar */}
      <AnimatePresence mode="wait">
        <m.div
          key={activeIndex}
          className="absolute top-0 left-0 h-0.5 w-1/5 bg-brand origin-left"
          style={{
            transformOrigin: 'left center',
          }}
          initial={false}
          animate={{
            x: `${activeIndex * 20}%`,
            scaleX: 1,
          }}
          transition={{
            type: 'spring',
            stiffness: SPRING.layout.stiffness,
            damping: SPRING.layout.damping,
            mass: SPRING.layout.mass,
          }}
        />
      </AnimatePresence>

      <ul className="mx-auto grid max-w-lg grid-cols-5 items-center px-1 py-1.5" role="tablist">
        {ITEMS.map((item, index) => (
          <BottomNavTab
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            index={index}
            active={activeIndex === index}
            pressed={pressedIndex === index}
            accent={'accent' in item && item.accent}
            reducedMotion={reducedMotion}
            badge={item.href === '/library' ? newInLibrary : null}
            onPressStart={handlePressStart}
            onPressEnd={handlePressEnd}
          />
        ))}

        {/* Profile tab */}
        <BottomNavTab
          href={profileHref}
          label="Profile"
          icon={User}
          index={4}
          active={profileActive}
          pressed={pressedIndex === 4}
          reducedMotion={reducedMotion}
          onPressStart={handlePressStart}
          onPressEnd={handlePressEnd}
        />
      </ul>
    </nav>
  );
}
