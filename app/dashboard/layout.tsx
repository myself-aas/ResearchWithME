import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import DashboardShell from '@/components/cms/DashboardShell';
import { getDashboardUser } from '@/lib/cms/auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export const metadata: Metadata = {
  title: 'Editorial studio',
  description: 'Write, review, and publish ResearchWithMe articles.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

// Every studio page depends on the session cookie and live draft data.
export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured;
  const user = await getDashboardUser();

  // The middleware already redirects; this is a second line of defence so a
  // route can never render drafts if the matcher is edited later.
  if (configured && !user) {
    redirect('/login?next=/dashboard');
  }

  return (
    <DashboardShell configured={configured} user={user}>
      {children}
    </DashboardShell>
  );
}
