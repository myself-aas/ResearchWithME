import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getDashboardUser } from '@/lib/cms/auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';

// Drafts, the article list, and the comment queue all depend on live data.
export const dynamic = 'force-dynamic';

/**
 * The publishing surfaces. Layered on top of the dashboard layout, which has
 * already established that someone is signed in.
 *
 * Readers who have not been approved yet are sent to the application page rather
 * than to /login, so they can see the state of their request instead of being
 * told to sign in again.
 */
export default async function StudioLayout({ children }: { children: ReactNode }) {
  if (isSupabaseConfigured) {
    const user = await getDashboardUser();
    if (!user?.isEditor) {
      redirect('/dashboard/access?error=not-editor');
    }
  }

  return <>{children}</>;
}
