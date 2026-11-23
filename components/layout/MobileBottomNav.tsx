'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { Compass, Library, PlusCircle, Sparkles, User } from 'lucide-react';
import { SPRING, EASING } from '@/lib/motion/tokens';

interface MobileBottomNavProps {
  profileHref?: string;
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

export default function MobileBottomNav({
  profileHref = '/login?next=%2Fdashboard%2Faccount',
}: MobileBottomNavProps) {
  const pathname = usePathname() || '/';
  const reducedMotion = useReducedMotion();
  const matchedIndex = ITEMS.findIndex((item) => item.match(pathname));
  const activeIndex = matchedIndex === -1 ? 4 : matchedIndex;
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);

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
            scaleX: activeIndex === 4 ? 1 : 1,
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
        {ITEMS.map((item, index) => {
          const active = activeIndex === index;
          const Icon = item.icon;
          const isPressed = pressedIndex === index;

          return (
            <li key={item.href} className="min-w-0" role="presentation">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                role="tab"
                aria-selected={active}
                aria-label={item.label}
                onMouseDown={() => handlePressStart(index)}
                onMouseUp={() => handlePressEnd()}
                onMouseLeave={() => handlePressEnd()}
                onTouchStart={() => handlePressStart(index)}
                onTouchEnd={() => handlePressEnd()}
                className={`relative flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 font-sans text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                  item.accent
                    ? 'text-brand font-semibold'
                    : active
                      ? 'text-ink'
                      : 'text-ink-secondary'
                }`}
              >
                {/* Icon wrapper with spring animations */}
                <AnimatePresence mode="wait">
                  <m.span
                    key={active.toString()}
                    initial={false}
                    animate={{
                      scale: active ? 1.15 : isPressed ? 0.85 : 1,
                      rotate: active ? (item.accent ? 90 : 0) : 0,
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
                      className={`h-6 w-6 transition-colors ${item.accent ? 'text-brand' : ''}`}
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
                  {item.label}
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
        })}

        {/* Profile tab */}
        <li className="min-w-0" role="presentation">
          <Link
            href={profileHref}
            aria-current={profileActive ? 'page' : undefined}
            role="tab"
            aria-selected={profileActive}
            aria-label="Profile"
            onMouseDown={() => handlePressStart(4)}
            onMouseUp={() => handlePressEnd()}
            onMouseLeave={() => handlePressEnd()}
            onTouchStart={() => handlePressStart(4)}
            onTouchEnd={() => handlePressEnd()}
            className={`relative flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 font-sans text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              profileActive ? 'text-ink' : 'text-ink-secondary'
            }`}
          >
            <AnimatePresence mode="wait">
              <m.span
                key={profileActive.toString()}
                initial={false}
                animate={{
                  scale: profileActive ? 1.15 : pressedIndex === 4 ? 0.85 : 1,
                  rotate: profileActive ? 0 : 0,
                }}
                transition={{
                  type: 'spring',
                  stiffness: SPRING.expressive.stiffness,
                  damping: SPRING.expressive.damping,
                  mass: SPRING.expressive.mass,
                }}
                style={{ willChange: 'transform' }}
                className="flex items-center justify-center"
              >
                <User className="h-6 w-6" aria-hidden="true" />
              </m.span>
            </AnimatePresence>

            <m.span
              initial={false}
              animate={{
                y: profileActive ? -1 : 0,
              }}
              transition={{
                duration: reducedMotion ? 0 : 0.15,
                ease: EASING.enter,
              }}
              className="truncate"
            >
              Profile
            </m.span>

            <AnimatePresence mode="wait">
              {profileActive && (
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
      </ul>
    </nav>
  );
}
