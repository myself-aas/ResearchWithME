'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ExternalLink, FileText, LogOut, MessageSquare, PenSquare } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { DashboardUser } from '@/lib/cms/types';
import { subtleButtonClass } from './styles';
import BrandLogo from '@/components/BrandLogo';

const navItems = [
  { href: '/dashboard', label: 'New review', icon: PenSquare, exact: true },
  { href: '/dashboard/manage', label: 'All reviews', icon: FileText, exact: false },
  { href: '/dashboard/comments', label: 'Comments', icon: MessageSquare, exact: false },
];

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
      setSignOutError('Signing out did not finish. Check your connection and try again.');
      setSigningOut(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="page-container flex max-w-wide flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" aria-label="πeme home" className="flex items-center gap-2.5">
              <BrandLogo size="md" />
            </Link>
            <span aria-hidden="true" className="hidden h-5 w-px bg-stone-200 sm:block" />
            <span className="hidden text-sm font-medium text-stone-600 sm:block">Article studio</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Link href="/" className={cn(subtleButtonClass, 'min-h-10 px-2.5')}>
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">View journal</span>
              <span className="sr-only sm:hidden">View journal</span>
            </Link>

            {configured && user ? (
              <>
                <span className="hidden max-w-[14rem] truncate px-2 text-sm text-stone-600 md:block" title={user.email}>
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
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-700" />
                Local demo
              </span>
            )}
          </div>
        </div>
        {signOutError && (
          <p role="alert" className="page-container max-w-wide pb-3 text-sm font-medium text-red-800">
            {signOutError}
          </p>
        )}
      </header>

      <div className="page-container max-w-wide flex-1 pb-16">
        <div className="lg:grid lg:grid-cols-[var(--container-rail-nav)_minmax(0,1fr)] lg:gap-10">
          <nav
            aria-label="Article studio"
            className="-mx-4 border-b border-stone-200 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:border-b-0 lg:border-r lg:px-0 lg:pr-6"
          >
            <ul className="flex flex-wrap gap-1 py-3 lg:sticky lg:top-6 lg:flex-col lg:gap-1 lg:py-8">
              {navItems.map((item) => {
                const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href} className="shrink-0">
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'inline-flex min-h-11 w-full items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-stone-900 text-white'
                          : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900',
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <main id="main-content" tabIndex={-1} className="min-w-0 py-6 outline-none sm:py-8">
            {!configured && (
              <div className="rounded-md mb-6 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">
                <p className="font-semibold">Local demo mode</p>
                <p className="mt-1 max-w-2xl">
                  Reviews and comments are saved to <code className="font-mono">data/cms-*.json</code> on the
                  server. Add Supabase credentials and run the included migrations to publish to the cloud.{' '}
                  <Link href="/login" className="font-semibold underline underline-offset-4">
                    Read the connection notes
                  </Link>
                  .
                </p>
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
