import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { pageMetadata } from '@/lib/seo';
import { getDashboardUser } from '@/lib/cms/auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export const metadata = pageMetadata({
  title: 'Writer Studio',
  description: 'Compose, preview, and publish a structured article with reproducible artifact metadata.',
  path: '/write',
  type: 'website' as const,
});

export const dynamic = 'force-dynamic';

/**
 * The standalone authoring form. It posts through the same CMS routes as the
 * studio, so it carries the same gate: an approved writer only.
 *
 * The gate lives here rather than in the page because the page is a client
 * component, and a client-side check is advisory at best — the API rejects
 * unauthorised writes regardless, but the reader should not be shown a form they
 * cannot submit.
 */
export default async function WriteLayout({ children }: { children: ReactNode }) {
  if (isSupabaseConfigured) {
    const user = await getDashboardUser();
    if (!user) redirect('/login?next=%2Fwrite');
    if (!user.isEditor) redirect('/dashboard/access?error=not-editor');
  }

  return <>{children}</>;
}
