import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import PageState from '@/components/PageState';
import AuthorApplication from '@/components/dashboard/AuthorApplication';
import { getDashboardUser } from '@/lib/cms/auth';
import type { AuthorApplication as Application } from '@/lib/applications';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  ...pageMetadata({
    title: 'Apply to Write — Specialist Verification',
    description:
      'Connect a verified GitHub or ORCID identity and apply to publish open-access peer reviews and repository teardowns on ResearchWithMe.',
    path: '/dashboard/access',
    type: 'website',
  }),
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export const dynamic = 'force-dynamic';

/**
 * Reachable by any signed-in account, which is the point: this is where a reader
 * becomes a writer. The `(studio)` group next to it carries the editor gate.
 */
export default async function ApplyToWritePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getDashboardUser();

  if (isSupabaseConfigured && !user) {
    redirect('/login?next=/dashboard/access');
  }

  const params = await searchParams;
  let applications: Application[] = [];

  if (isSupabaseConfigured) {
    try {
      const supabase = await createSupabaseServerClient();
      // Row-level security narrows this to the caller's own rows for a reader.
      const { data, error } = await supabase
        .from('author_applications')
        .select('*')
        .eq('user_id', user?.id ?? '')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      applications = (data ?? []) as Application[];
    } catch (error) {
      console.error('Could not read your author application:', error);
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <PageState
        as="div"
        code="Unavailable"
        title="Applications need Supabase"
        description="Writer applications are stored in Postgres and reviewed through row-level security. Configure Supabase to accept them; until then the studio runs in local demo mode."
        primaryAction={{ href: '/', label: 'Back to the platform' }}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
          Apply to write
        </h1>
        <p className="mt-3 max-w-prose text-base leading-relaxed text-stone-700">
          Signing in gives you a reader account. Publishing needs a person on the editorial board to
          approve you, so every article carries a byline someone stands behind.
        </p>
        {params.error === 'not-editor' && (
          <p className="mt-4 border-l-2 border-indigo-300 bg-indigo-50 px-3 py-2 text-sm leading-relaxed text-brand">
            This account does not have publishing access yet. Apply below and an editor will review
            it.
          </p>
        )}
      </header>

      <AuthorApplication applications={applications} isEditor={user?.isEditor ?? false} />
    </div>
  );
}
