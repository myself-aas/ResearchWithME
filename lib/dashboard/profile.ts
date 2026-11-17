import 'server-only';

import type { DashboardUser } from '@/lib/cms/types';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { ProfileSocialCounts } from '@/lib/profile/counters';
import { normalizeSocialCounts } from '@/lib/profile/counters';

/**
 * The signed-in person as the dashboard chrome needs them.
 *
 * Every field is either read from `public.profiles` (when the account has an
 * author profile) or derived from the session. Nothing here is invented: an
 * account without a profile simply renders fewer facts, and the role label
 * falls back to the permission the session actually carries.
 */
export interface DashboardProfileSummary {
  displayName: string;
  role: string;
  bio: string | null;
  domain: string | null;
  institution: string | null;
  avatarUrl: string | null;
  joinedYear: string | null;
  /** True when the facts came from `public.profiles`, not just the session. */
  hasProfile: boolean;
  /**
   * Real aggregate counts, or `null` when the aggregate could not be read.
   * The header hides the stat strip when this is null so a failed query never
   * looks like a zero.
   */
  counts: ProfileSocialCounts | null;
}

/**
 * The caller's row as the profile form needs it. Distinct from the summary
 * because the form must round-trip every editable column (including the slug
 * and the published flag) instead of a display-ready projection.
 */
export interface EditableProfile {
  userId: string;
  slug: string;
  displayName: string;
  role: string;
  domain: string;
  institution: string;
  bio: string;
  orcid: string;
  github: string;
  website: string;
  scholar: string;
  avatarUrl: string | null;
  published: boolean;
  createdAt: string | null;
}

interface EditableProfileRow {
  user_id: string;
  slug: string;
  display_name: string | null;
  role: string | null;
  domain: string | null;
  institution: string | null;
  bio: string | null;
  orcid: string | null;
  github: string | null;
  website: string | null;
  scholar: string | null;
  avatar_url: string | null;
  published: boolean | null;
  created_at: string | null;
}

interface ProfileRow {
  display_name: string | null;
  role: string | null;
  bio: string | null;
  domain: string | null;
  institution: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

export function roleLabelFor(user: DashboardUser | null): string {
  if (!user) return 'Local demo';
  if (user.isEditorInChief) return 'Editor-in-Chief';
  if (user.isEditor) return 'Editor · Writer';
  return 'Reader';
}

function summaryFromSession(user: DashboardUser | null): DashboardProfileSummary | null {
  if (!user) return null;
  return {
    displayName: user.name,
    role: roleLabelFor(user),
    bio: null,
    domain: null,
    institution: null,
    avatarUrl: null,
    joinedYear: null,
    hasProfile: false,
    counts: null,
  };
}

/**
 * Reads the caller's aggregate counters through `v34_profile_social_counts`.
 *
 * The RPC is the only way to count saves, because `v34_library_items` is
 * owner-only. Any error (function not migrated yet, no network) returns null so
 * the header can omit the counters rather than claim a zero.
 */
export async function loadProfileSocialCounts(userId: string): Promise<ProfileSocialCounts | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('v34_profile_social_counts', {
      p_user_id: userId,
    });
    if (error) throw new Error(error.message);
    return normalizeSocialCounts(data);
  } catch (error) {
    console.error('Could not read profile social counters:', error);
    return null;
  }
}

/** Reads every editable column of the caller's own profile, or null. */
export async function loadEditableProfile(userId: string): Promise<EditableProfile | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'user_id, slug, display_name, role, domain, institution, bio, orcid, github, website, scholar, avatar_url, published, created_at',
      )
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const row = (data as EditableProfileRow | null) ?? null;
    if (!row) return null;
    return {
      userId: row.user_id,
      slug: row.slug,
      displayName: row.display_name?.trim() ?? '',
      role: row.role?.trim() ?? '',
      domain: row.domain?.trim() ?? '',
      institution: row.institution?.trim() ?? '',
      bio: row.bio?.trim() ?? '',
      orcid: row.orcid?.trim() ?? '',
      github: row.github?.trim() ?? '',
      website: row.website?.trim() ?? '',
      scholar: row.scholar?.trim() ?? '',
      avatarUrl: row.avatar_url?.trim() || null,
      published: row.published ?? false,
      createdAt: row.created_at,
    };
  } catch (error) {
    console.error('Could not read the editable profile:', error);
    return null;
  }
}

/**
 * Loads the dashboard profile summary.
 *
 * Reads only the caller's own row, so RLS stays in charge; any failure (missing
 * migration, revoked key, offline) degrades to the session-only summary rather
 * than blanking the dashboard header.
 */
export async function loadDashboardProfile(
  user: DashboardUser | null,
): Promise<DashboardProfileSummary | null> {
  if (!user) return null;
  if (!isSupabaseConfigured) return summaryFromSession(user);

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('display_name, role, bio, domain, institution, avatar_url, created_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const row = (data as ProfileRow | null) ?? null;
    if (!row) return summaryFromSession(user);
    const counts = await loadProfileSocialCounts(user.id);
    return {
      displayName: row.display_name?.trim() || user.name,
      role: row.role?.trim() || roleLabelFor(user),
      bio: row.bio?.trim() || null,
      domain: row.domain?.trim() || null,
      institution: row.institution?.trim() || null,
      avatarUrl: row.avatar_url?.trim() || null,
      joinedYear: row.created_at ? String(new Date(row.created_at).getUTCFullYear()) : null,
      hasProfile: true,
      counts,
    };
  } catch (error) {
    console.error('Could not read the dashboard profile:', error);
    return summaryFromSession(user);
  }
}
