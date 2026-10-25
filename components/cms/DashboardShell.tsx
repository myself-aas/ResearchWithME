'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ExternalLink, FileText, LogOut, MessageSquare, PenSquare } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { DashboardUser } from '@/lib/cms/types';
import { subtleButtonClass } from './styles';

const navItems = [
  { href: '/dashboard', label: 'New article', icon: PenSquare, exact: true },
  { href: '/dashboard/manage', label: 'Articles', icon: FileText, exact: false },
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
      setSignOutError('Sign out did not complete. Check your connection and try again.');
      setSigningOut(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-900 font-serif text-lg font-bold text-stone-50"
              >
                R
              </span>
              <span className="font-serif text-lg font-bold tracking-tight text-stone-900">
                ResearchWith<span className="text-amber-800">.me</span>
              </span>
            </Link>
            <span aria-hidden="true" className="hidden h-5 w-px bg-stone-200 sm:block" />
            <span className="hidden text-sm font-medium text-stone-600 sm:block">Editorial studio</span>
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
          <p role="alert" className="mx-auto max-w-7xl px-4 pb-3 text-sm font-medium text-red-800 sm:px-6 lg:px-8">
            {signOutError}
          </p>
        )}
      </header>

      <div className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
          <nav
            aria-label="Editorial studio"
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

          <main className="min-w-0 py-6 sm:py-8">
            {!configured && (
              <div className="mb-6 border-l-2 border-amber-700 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">
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
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
