import type { Metadata } from 'next';
import PageState from '@/components/PageState';
import ApplicationQueue from '@/components/dashboard/ApplicationQueue';
import type { AuthorApplication } from '@/lib/applications';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Writer applications',
  description: 'Review pending applications to publish on ResearchWithMe.',
};

export const dynamic = 'force-dynamic';

/**
 * The review queue. The `(studio)` layout has already established that the caller
 * is an editor, and row-level security returns every row for an editor and only
 * the caller's own rows for anyone else.
 */
export default async function ApplicationQueuePage() {
  if (!isSupabaseConfigured) {
    return (
      <PageState
        code="Unavailable"
        title="Applications need Supabase"
        description="There is no application queue in local demo mode."
        primaryAction={{ href: '/dashboard', label: 'Back to the studio' }}
      />
    );
  }

  let applications: AuthorApplication[] = [];
  let failed = false;

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('author_applications')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    applications = (data ?? []) as AuthorApplication[];
  } catch (error) {
    failed = true;
    console.error('Could not read the writer application queue:', error);
  }

  if (failed) {
    return (
      <PageState
        code="Unavailable"
        title="The queue could not be read"
        description="Check that the author_applications migration has been applied, then reload."
        primaryAction={{ href: '/dashboard', label: 'Back to the studio' }}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
          Writer applications
        </h1>
        <p className="mt-3 max-w-prose text-base leading-relaxed text-stone-700">
          Approving an application adds the applicant to the editor allowlist immediately. Rejecting
          leaves a note they can read, and they may apply again.
        </p>
      </header>

      <ApplicationQueue applications={applications} />
    </div>
  );
}
