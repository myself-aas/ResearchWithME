import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import PageState from '@/components/PageState';
import AuthorApplication from '@/components/dashboard/AuthorApplication';
import ProfilePhotoCard from '@/components/dashboard/ProfilePhotoCard';
import { profileToAuthor, type ProfileRow } from '@/lib/author-directory-core';
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
  let profile: ProfileRow | null = null;

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

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('slug, display_name, bio, role, domain, institution, avatar_url, orcid, github, website, scholar, created_at')
        .eq('user_id', user?.id ?? '')
        .maybeSingle();
      if (profileError) throw new Error(profileError.message);
      profile = (profileData as ProfileRow | null) ?? null;
    } catch (error) {
      console.error('Could not read your author application or profile:', error);
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
        <h1 className="font-serif text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Apply to write
        </h1>
        <p className="mt-3 max-w-prose text-base leading-relaxed text-ink">
          Signing in gives you a reader account. Publishing access is granted by the editor after a
          short review, so every article carries a byline someone stands behind.
        </p>
        {params.error === 'not-editor' && (
          <p className="mt-4 border-l-2 border-brand/40 bg-brand/5 px-3 py-2 text-sm leading-relaxed text-brand">
            This account does not have publishing access yet. Apply below and an editor will review
            it.
          </p>
        )}
      </header>

      {user &&
        (profile ? (
          <ProfilePhotoCard userId={user.id} author={profileToAuthor(profile)} />
        ) : (
          <p className="mb-6 text-sm leading-relaxed text-ink-secondary">
            Your profile photo can be added once your author profile exists.
          </p>
        ))}

      <AuthorApplication applications={applications} isEditor={user?.isEditor ?? false} />
    </div>
  );
}
