import type { Metadata } from 'next';
import Link from 'next/link';
import ProfileEditor from '@/components/dashboard/ProfileEditor';
import ProfilePhotoCard from '@/components/dashboard/ProfilePhotoCard';
import type { Author } from '@/lib/blog-data';
import { getDashboardUser } from '@/lib/cms/auth';
import { loadEditableProfile } from '@/lib/dashboard/profile';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  ...pageMetadata({
    title: 'Your profile',
    description: 'Edit the name, bio, affiliation, and links shown on your ResearchWithMe author page.',
    path: '/dashboard/profile',
    type: 'website',
  }),
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';

function authorFromProfile(profile: NonNullable<Awaited<ReturnType<typeof loadEditableProfile>>>): Author {
  return {
    id: profile.slug,
    name: profile.displayName,
    avatar: profile.avatarUrl ?? '',
    bio: profile.bio,
    role: profile.role,
    domain: profile.domain,
    institution: profile.institution || undefined,
    orcid: profile.orcid || undefined,
    github: profile.github || undefined,
    website: profile.website || undefined,
    scholar: profile.scholar || undefined,
    joinedDate: profile.createdAt ? String(new Date(profile.createdAt).getUTCFullYear()) : '',
    articleCount: 0,
  };
}

/**
 * The owner's view of their own directory row.
 *
 * The form writes straight to `public.profiles` under the owner-only policies;
 * this page only reads the row so the fields open with real values. When the
 * account has no row yet, the form creates one — the "published" switch stays in
 * the author's hands either way.
 */
export default async function ProfileSettingsPage() {
  const user = await getDashboardUser();
  const profile = user ? await loadEditableProfile(user.id) : null;

  return (
    <div>
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Dashboard</p>
        <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-ink">Profile</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-secondary">
          Everything here is public on your author page when you publish your profile. Your role badge and
          permissions are not edited here — those come from the editorial team.
        </p>
      </header>

      {!user ? (
        <section aria-labelledby="profile-signin" className="rounded-2xl border border-line bg-surface-raised p-6">
          <h2 id="profile-signin" className="font-serif text-xl font-semibold text-ink">
            Sign in to edit your profile
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-secondary">
            {isSupabaseConfigured
              ? 'Profile editing is tied to your account, so it needs a signed-in session.'
              : 'This preview runs without an identity provider, so there is no profile to edit. Set the Supabase environment variables to enable accounts.'}
          </p>
          <Link
            href="/login?next=/dashboard/profile"
            className="mt-4 inline-flex min-h-11 items-center rounded-full bg-brand px-5 text-sm font-semibold text-on-primary"
          >
            Sign in
          </Link>
        </section>
      ) : (
        <div className="space-y-6">
          {profile ? <ProfilePhotoCard userId={user.id} author={authorFromProfile(profile)} /> : null}
          <ProfileEditor
            userId={user.id}
            email={user.email}
            sessionName={user.name}
            profile={profile}
          />
          {profile ? (
            <p className="text-sm leading-relaxed text-ink-secondary">
              Looking for your application, photo, and writer access? Those stay on{' '}
              <Link href="/dashboard/access" className="font-medium text-link underline-offset-2 hover:underline">
                Apply to write
              </Link>
              .
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
