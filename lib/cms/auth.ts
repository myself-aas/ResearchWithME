import 'server-only';

import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { DashboardUser } from './types';

export type { DashboardUser } from './types';

export type EditorGate =
  | { ok: true; user: DashboardUser | null; mode: 'local' | 'supabase' }
  | { ok: false; status: 401 | 403; error: string };

function displayName(email: string | undefined, metadata: Record<string, unknown>) {
  const candidates = [metadata.full_name, metadata.name, metadata.display_name];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim().slice(0, 120);
  }
  return email?.split('@')[0]?.slice(0, 80) || 'Editor';
}

import { cookies } from 'next/headers';

/**
 * Returns the signed-in Supabase user, or null when absent or in local mode.
 * `isEditor` fails closed: if the allowlist cannot be read (for example the
 * editor migration has not been applied) the user is treated as a reader.
 */
export async function getDashboardUser(): Promise<DashboardUser | null> {
  if (!isSupabaseConfigured) {
    try {
      const cookieStore = await cookies();
      const raw = cookieStore.get('rwm_session')?.value;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.name) {
          return {
            id: parsed.id || 'local-editor',
            email: parsed.email || 'editor@researchwith.me',
            name: parsed.name,
            isEditor: true,
          };
        }
      }
    } catch {
      // Local cookie unparseable, proceed as null
    }
    return null;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;

    const metadata = (data.user.user_metadata ?? {}) as Record<string, unknown>;
    const { data: isEditor, error: editorError } = await supabase.rpc('is_editor');
    if (editorError) {
      console.error('Could not read the editor allowlist:', editorError.message);
    }

    return {
      id: data.user.id,
      email: data.user.email ?? '',
      name: displayName(data.user.email ?? undefined, metadata),
      isEditor: isEditor === true,
    };
  } catch (error) {
    console.error('Could not read the Supabase session:', error);
    return null;
  }
}

/**
 * Guard for studio routes. In local demo mode writes are allowed against the
 * JSON archive; once Supabase is configured every request requires a session
 * that belongs to the editor allowlist.
 */
export async function requireEditor(): Promise<EditorGate> {
  if (!isSupabaseConfigured) {
    return { ok: true, user: null, mode: 'local' };
  }

  const user = await getDashboardUser();
  if (!user) {
    return { ok: false, status: 401, error: 'Sign in to the editorial studio to continue.' };
  }
  if (!user.isEditor) {
    return { ok: false, status: 403, error: 'This account does not have editor access. Ask an administrator to add it.' };
  }

  return { ok: true, user, mode: 'supabase' };
}
