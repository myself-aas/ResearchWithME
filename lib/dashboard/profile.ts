import 'server-only';

import type { DashboardUser } from '@/lib/cms/types';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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
  };
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
    return {
      displayName: row.display_name?.trim() || user.name,
      role: row.role?.trim() || roleLabelFor(user),
      bio: row.bio?.trim() || null,
      domain: row.domain?.trim() || null,
      institution: row.institution?.trim() || null,
      avatarUrl: row.avatar_url?.trim() || null,
      joinedYear: row.created_at ? String(new Date(row.created_at).getUTCFullYear()) : null,
      hasProfile: true,
    };
  } catch (error) {
    console.error('Could not read the dashboard profile:', error);
    return summaryFromSession(user);
  }
}
