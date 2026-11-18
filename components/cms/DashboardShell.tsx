'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { DashboardUser } from '@/lib/cms/types';
import type { DashboardProfileSummary } from '@/lib/dashboard/profile';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import DashboardProfileHeader from '@/components/dashboard/DashboardProfileHeader';
import DashboardTabs, { tabsForRole } from '@/components/dashboard/DashboardTabs';

const DashboardUserContext = createContext<DashboardUser | null>(null);

export function useDashboardUser(): DashboardUser | null {
  return useContext(DashboardUserContext);
}

interface DashboardShellProps {
  children: React.ReactNode;
  configured: boolean;
  user: DashboardUser | null;
  profile?: DashboardProfileSummary | null;
}

/**
 * The dashboard chrome, once: site header → profile header → section tabs →
 * page. The old shell stacked a vertical sidebar on top of the site navigation
 * and each page repeated its own title and links, which read as three menus for
 * one destination. The tabs carry every section in a single scrollable row, the
 * way a profile does on X, LinkedIn, or Reddit.
 */
export default function DashboardShell({
  children,
  configured,
  user,
  profile = null,
}: DashboardShellProps) {
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
      try {
        const { performLogoutLocalWipe } = await import('@/lib/persistence/logout-wipe');
        await performLogoutLocalWipe({ clearLocalDrafts: true });
      } catch {
        // Non-fatal if the browser blocks storage cleanup.
      }
      router.replace('/login');
      router.refresh();
    } catch {
      setSignOutError('Sign out did not complete. Check your connection and try again.');
      setSigningOut(false);
    }
  }

  const tabs = tabsForRole({ isEditor: Boolean(user?.isEditor), demoMode: !configured });

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <BlogHeader />

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 lg:px-8">
        {profile ? (
          <DashboardProfileHeader
            profile={profile}
            isEditor={Boolean(user?.isEditor)}
            isEditorInChief={Boolean(user?.isEditorInChief)}
            signingOut={signingOut}
            signOutError={signOutError}
            onSignOut={signOut}
          />
        ) : null}

        <DashboardTabs tabs={tabs} className={profile ? undefined : 'mt-4'} />

        {!configured && (
          <div className="mt-6 border-l-2 border-trust-uncertain bg-brand/5 px-4 py-3 text-sm leading-relaxed text-brand-pressed">
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

        <main tabIndex={-1} id="main-content" className="min-w-0 py-6 sm:py-8">
          <DashboardUserContext.Provider value={user}>{children}</DashboardUserContext.Provider>
        </main>
      </div>

      <BlogFooter />
    </div>
  );
}
