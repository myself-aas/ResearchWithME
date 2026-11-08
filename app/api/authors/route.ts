import { NextResponse } from 'next/server';

import type { Author } from '@/lib/blog-data';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getSupabasePublicClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ProfileRow {
  slug: string;
  display_name: string;
  bio: string;
  role: string;
  domain: string;
  institution: string;
  avatar_url: string;
  orcid: string;
  github: string;
  website: string;
  scholar: string;
  created_at: string;
}

/**
 * `public.profiles` is the only source of authors now. The static roster that
 * used to back this endpoint was fabricated and has been deleted.
 *
 * Note what is deliberately NOT set: `verifiedVia`. The orcid and github
 * columns on a profile are self-declared, and the authoritative record —
 * auth.users.identities, which the writer application actually checks — is not
 * readable by an anonymous client. Claiming verification from a self-declared
 * string would be exactly the false badge the directory just got rid of, so the
 * identifiers are exposed as plain links and the badge is left unset.
 */
function profileToAuthor(profile: ProfileRow): Author {
  return {
    id: profile.slug,
    name: profile.display_name,
    avatar: profile.avatar_url,
    bio: profile.bio,
    role: profile.role,
    domain: profile.domain,
    institution: profile.institution || undefined,
    orcid: profile.orcid || undefined,
    github: profile.github || undefined,
    website: profile.website || undefined,
    scholar: profile.scholar || undefined,
    joinedDate: String(new Date(profile.created_at).getUTCFullYear()),
    articleCount: 0,
  };
}

export async function GET() {
  const headers = { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=600' };

  // Local mode has no profiles table; the directory is simply empty.
  if (!isSupabaseConfigured) {
    return NextResponse.json({ authors: [] satisfies Author[] }, { headers });
  }

  try {
    const { data, error } = await getSupabasePublicClient()
      .from('profiles')
      .select(
        'slug, display_name, bio, role, domain, institution, avatar_url, orcid, github, website, scholar, created_at',
      )
      // An anonymous client only ever sees published rows under RLS, but the
      // filter is stated so the endpoint does not depend on the policy for
      // correctness.
      .eq('published', true)
      .order('display_name', { ascending: true });

    if (error) throw error;

    const authors = (data ?? []).map((profile) => profileToAuthor(profile as ProfileRow));
    return NextResponse.json({ authors }, { headers });
  } catch (err) {
    console.error('Failed to fetch authors:', err);
    return NextResponse.json({ error: 'Internal server error fetching authors' }, { status: 500 });
  }
}
