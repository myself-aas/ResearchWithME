'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Library, PlusCircle, Sparkles, User } from 'lucide-react';

interface MobileBottomNavProps {
  profileHref?: string;
}

/**
 * Mobile Bottom Navigation — Primary mobile destinations:
 *   Explore, Library, Contribute, AI, Profile.
 * Projects, Reviews, Sources, Evidence, Claims, Dashboard sections, and
 * Settings live in the mobile navigation drawer.
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

export default function MobileBottomNav({
  profileHref = '/login?next=%2Fdashboard%2Faccount',
}: MobileBottomNavProps) {
  const pathname = usePathname() || '/';

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

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 backdrop-blur-md lg:hidden pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 items-center px-1 py-1">
        {ITEMS.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1 font-sans text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                  item.accent
                    ? 'text-brand font-semibold'
                    : active
                      ? 'text-ink'
                      : 'text-ink-secondary hover:text-ink'
                }`}
              >
                <Icon
                  className={item.accent ? 'h-5 w-5 text-brand' : 'h-5 w-5'}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
        <li className="min-w-0">
          <Link
            href={profileHref}
            aria-current={profileActive ? 'page' : undefined}
            className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1 font-sans text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              profileActive ? 'text-ink' : 'text-ink-secondary hover:text-ink'
            }`}
          >
            <User className="h-5 w-5" aria-hidden="true" />
            <span className="truncate">Profile</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
