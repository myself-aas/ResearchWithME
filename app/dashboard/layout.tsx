import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import DashboardShell from '@/components/cms/DashboardShell';
import { getDashboardUser } from '@/lib/cms/auth';
import { loadDashboardProfile } from '@/lib/dashboard/profile';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export const metadata: Metadata = {
  title: 'Your account',
  description: 'Manage your ResearchWithMe account and apply to write.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

// Every dashboard page depends on the session cookie and live data.
export const dynamic = 'force-dynamic';

/**
 * Requires a signed-in account, not editor access. The `(studio)` group adds the
 * editor requirement on top, so `/dashboard/access` stays reachable by the
 * readers who are applying to write.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured;
  const user = await getDashboardUser();
  const profile = await loadDashboardProfile(user);

  // The middleware already redirects; this is a second line of defence so the
  // matcher can be edited later without exposing the dashboard.
  if (configured && !user) {
    redirect('/login?next=/dashboard/access');
  }

  return (
    <DashboardShell configured={configured} user={user} profile={profile}>
      {children}
    </DashboardShell>
  );
}
