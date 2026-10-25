import 'server-only';

import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { DashboardUser } from './types';

export type { DashboardUser } from './types';

export type EditorGate =
  | { ok: true; user: DashboardUser | null; mode: 'local' | 'supabase' }
  | { ok: false; status: 401; error: string };

function displayName(email: string | undefined, metadata: Record<string, unknown>) {
  const candidates = [metadata.full_name, metadata.name, metadata.display_name];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim().slice(0, 120);
  }
  return email?.split('@')[0]?.slice(0, 80) || 'Editor';
}

/** Returns the signed-in Supabase user, or null when absent or in local mode. */
export async function getDashboardUser(): Promise<DashboardUser | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;

    const metadata = (data.user.user_metadata ?? {}) as Record<string, unknown>;
    return {
      id: data.user.id,
      email: data.user.email ?? '',
      name: displayName(data.user.email ?? undefined, metadata),
    };
  } catch (error) {
    console.error('Could not read the Supabase session:', error);
    return null;
  }
}

/**
 * Guard for mutation routes. In local demo mode writes are allowed against the
 * JSON archive; once Supabase is configured every write requires a session.
 */
export async function requireEditor(): Promise<EditorGate> {
  if (!isSupabaseConfigured) {
    return { ok: true, user: null, mode: 'local' };
  }

  const user = await getDashboardUser();
  if (!user) {
    return { ok: false, status: 401, error: 'Sign in to the editorial studio to continue.' };
  }

  return { ok: true, user, mode: 'supabase' };
}
