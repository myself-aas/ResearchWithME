'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpen,
  FileText,
  LayoutDashboard,
  LineChart,
  LogOut,
  MessageSquare,
  PenSquare,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { DashboardUser } from '@/lib/cms/types';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { subtleButtonClass } from './styles';

interface NavItem {
  href: string;
  label: string;
  icon: typeof PenSquare;
  exact: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const readingItem: NavItem = { href: '/dashboard/reading', label: 'My reading', icon: BookOpen, exact: false };

/** Every signed-in account gets the reading dashboard and the application page. */
const accountNav: NavSection[] = [
  {
    label: 'Overview',
    items: [readingItem],
  },
  {
    label: 'Account',
    items: [
      { href: '/dashboard/access', label: 'Apply to write', icon: ShieldCheck, exact: false },
    ],
  },
];

/**
 * Approved writers get one dashboard per job — the desk, their own byline, and
 * their reading — above the publishing surfaces and the review queues.
 */
const studioNav: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard/desk', label: 'Desk', icon: LayoutDashboard, exact: false },
      { href: '/dashboard/writing', label: 'My writing', icon: LineChart, exact: false },
      readingItem,
    ],
  },
  {
    label: 'Studio',
    items: [
      { href: '/dashboard', label: 'New article', icon: PenSquare, exact: true },
      { href: '/dashboard/manage', label: 'Articles', icon: FileText, exact: false },
      { href: '/dashboard/comments', label: 'Comments', icon: MessageSquare, exact: false },
      { href: '/dashboard/applications', label: 'Applications', icon: UserCheck, exact: false },
    ],
  },
];

const DashboardUserContext = createContext<DashboardUser | null>(null);

export function useDashboardUser(): DashboardUser | null {
  return useContext(DashboardUserContext);
}

interface DashboardShellProps {
  children: React.ReactNode;
  configured: boolean;
  user: DashboardUser | null;
}

export default function DashboardShell({ children, configured, user }: DashboardShellProps) {
  const pathname = usePathname() || '/dashboard';
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  useEffect(() => {
    setSignOutError(null);
  }, [pathname]);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace('/login');
      router.refresh();
    } catch {
      setSignOutError('Sign out did not complete. Check your connection and try again.');
      setSigningOut(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <BlogHeader />

      <div className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
          <div className="-mx-4 border-b border-line px-4 py-3 sm:-mx-6 sm:px-6 lg:mx-0 lg:border-b-0 lg:border-r lg:px-0 lg:py-8 lg:pr-6">
            <nav aria-label="Dashboard" className="lg:sticky lg:top-6">
              {/* Demo mode has no account, and its studio is open, so it shows the studio set. */}
              {(user?.isEditor || !configured ? studioNav : accountNav).map((section, index) => (
                <div key={section.label} className={cn(index > 0 && 'mt-2 lg:mt-6')}>
                  <p className="hidden text-xs font-semibold uppercase tracking-wider text-ink-secondary lg:block">
                    {section.label}
                  </p>
                  <ul className="flex flex-wrap gap-1 lg:mt-3 lg:flex-col lg:py-0">
                    {section.items.map((item) => {
                      const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                      const Icon = item.icon;
                      return (
                        <li key={item.href} className="shrink-0">
                          <Link
                            href={item.href}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                              'inline-flex min-h-11 w-full items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                              active
                                ? 'bg-brand text-on-primary'
                                : 'text-ink hover:bg-surface hover:text-ink',
                            )}
                          >
                            <Icon className="h-4 w-4" aria-hidden="true" />
                            <span>{item.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>

            {configured && user && (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-sm lg:mt-6">
                <span
                  className="min-w-0 max-w-full truncate text-ink-secondary lg:max-w-[10rem]"
                  title={user.email}
                >
                  {user.name}
                </span>
                <button
                  type="button"
                  onClick={signOut}
                  disabled={signingOut}
                  className={cn(subtleButtonClass, 'min-h-10 px-2.5')}
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  <span>{signingOut ? 'Signing out…' : 'Sign out'}</span>
                </button>
              </div>
            )}
            {signOutError && (
              <p role="alert" className="mt-2 text-sm font-medium text-destructive">
                {signOutError}
              </p>
            )}
          </div>

          <main tabIndex={-1} id="main-content" className="min-w-0 py-6 sm:py-8">
            {!configured && (
              <div className="mb-6 border-l-2 border-trust-uncertain bg-brand/5 px-4 py-3 text-sm leading-relaxed text-brand-pressed">
                <p className="font-semibold">Local demo mode</p>
                <p className="mt-1 max-w-2xl">
                  Articles and comments on this studio are saved to <code className="font-mono">data/cms-*.json</code> on
                  the server. Add Supabase credentials and run the included migrations to publish to the cloud.{' '}
                  <Link href="/login" className="font-semibold underline underline-offset-4">
                    Read the connection notes
                  </Link>
                  .
                </p>
              </div>
            )}
            <DashboardUserContext.Provider value={user}>
              {children}
            </DashboardUserContext.Provider>
          </main>
        </div>
      </div>

      <BlogFooter />
    </div>
  );
}
