'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  FileText,
  IdCard,
  LayoutDashboard,
  LineChart,
  MessageSquare,
  ShieldCheck,
  UserCheck,
  UserRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Tab {
  href: string;
  label: string;
  icon: typeof BookOpen;
  exact?: boolean;
}

const readingTab: Tab = { href: '/dashboard/reading', label: 'My reading', icon: BookOpen };
const profileTab: Tab = { href: '/dashboard/profile', label: 'Profile', icon: IdCard };
const accountTab: Tab = { href: '/dashboard/account', label: 'Account', icon: UserRound };

/** Every signed-in account: their reading, the application, profile, account. */
export const readerTabs: Tab[] = [
  readingTab,
  { href: '/dashboard/access', label: 'Apply to write', icon: ShieldCheck },
  profileTab,
  accountTab,
];

/**
 * Approved writers and editors. These are jobs, not settings, and the order
 * matches how often each is opened: desk, own byline, reading, then the
 * publishing queues.
 */
export const studioTabs: Tab[] = [
  { href: '/dashboard/desk', label: 'Desk', icon: LayoutDashboard },
  { href: '/dashboard/writing', label: 'My writing', icon: LineChart },
  readingTab,
  { href: '/dashboard/manage', label: 'Articles', icon: FileText },
  { href: '/dashboard/comments', label: 'Comments', icon: MessageSquare },
  { href: '/dashboard/applications', label: 'Applications', icon: UserCheck },
  profileTab,
  accountTab,
];

export function tabsForRole(options: { isEditor: boolean; demoMode: boolean }): Tab[] {
  return options.isEditor || options.demoMode ? studioTabs : readerTabs;
}

/**
 * Horizontal section switcher, directly under the profile header — the pattern
 * people already know from X, LinkedIn, and Instagram.
 *
 * The strip scrolls sideways with momentum and snap points on narrow screens
 * (no wrapping into a tall block of links), and the fade on the right edge is
 * the affordance that says there is more to scroll. On desktop all tabs fit,
 * so the fade disappears.
 */
export default function DashboardTabs({
  tabs,
  className,
}: {
  tabs: Tab[];
  className?: string;
}) {
  const pathname = usePathname() || '/dashboard';

  return (
    <div
      className={cn(
        'sticky top-[60px] z-30 -mx-4 mt-3 border-b border-line bg-canvas/95 backdrop-blur sm:-mx-6 lg:mx-0',
        className,
      )}
    >
      <nav aria-label="Dashboard sections" className="relative">
        <ul
          role="list"
          className="scrollbar-none -mb-px flex snap-x snap-mandatory gap-1 overflow-x-auto scroll-smooth px-4 sm:px-6 lg:px-0"
        >
          {tabs.map((tab) => {
            const active = tab.exact
              ? pathname === tab.href
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            const Icon = tab.icon;
            return (
              <li key={tab.href} className="shrink-0 snap-start">
                <Link
                  href={tab.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-t-lg border-b-2 px-3 text-sm font-medium transition-colors',
                    'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand',
                    active
                      ? 'border-brand text-ink'
                      : 'border-transparent text-ink-secondary hover:border-line hover:text-ink',
                  )}
                >
                  <Icon
                    className={cn('h-4 w-4 shrink-0', active ? 'text-brand' : 'text-ink-secondary')}
                    aria-hidden="true"
                  />
                  <span>{tab.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        {/* Right-edge fade: signals horizontal overflow without a scrollbar. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-canvas to-transparent lg:hidden"
        />
      </nav>
    </div>
  );
}
