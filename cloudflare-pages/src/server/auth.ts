import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isPublicConfigValid, PublicConfigError, type RequestContext } from './context';
import { safeNextPath } from '@/lib/safe-redirect';
import type { DashboardUser } from '@/lib/cms/types';

export type EditorGate =
  | { ok: true; user: DashboardUser | null; mode: 'local' | 'supabase' }
  | { ok: false; status: 401 | 403 | 503; error: string };

export type { DashboardUser } from '@/lib/cms/types';

function displayName(email: string | undefined, metadata: Record<string, unknown>) {
  const candidates = [metadata.full_name, metadata.name, metadata.display_name];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim().slice(0, 120);
  }
  return email?.split('@')[0]?.slice(0, 80) || 'Editor';
}

/**
 * Cookie-bound server client for this request. Reads nothing from globals:
 * the URL and publishable key come from the build-time public config, the
 * cookie jar belongs to this request. Throws PublicConfigError when the
 * deployment has no valid public configuration — callers map that to a
 * fail-closed 503/null rather than a silent demo mode.
 */
export function createSupabaseServerClient(ctx: RequestContext): SupabaseClient {
  if (!isPublicConfigValid(ctx.config)) {
    throw new PublicConfigError('Supabase is not configured for this deployment.');
  }
  return createServerClient(ctx.config.supabaseUrl, ctx.config.supabaseKey, {
    cookies: {
      getAll: () => ctx.cookies.getAll(),
      setAll: (cookies, headers) => ctx.cookies.setAll(cookies, headers),
    },
  });
}

function sessionClientFor(ctx: RequestContext): SupabaseClient {
  // Prefer the request-scoped client wired by the runtime; fall back to a
  // locally constructed one so the gate works even where the harness or a
  // future production wiring does not supply one.
  return ctx.services.sessionClient(ctx) ?? createSupabaseServerClient(ctx);
}

/**
 * The signed-in user with their editor allowlist status, or null. `isEditor`
 * fails closed: when the allowlist cannot be read the user is a reader.
 */
export async function getDashboardUser(ctx: RequestContext): Promise<DashboardUser | null> {
  if (!isPublicConfigValid(ctx.config)) return null;
  try {
    const supabase = sessionClientFor(ctx);
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;

    const metadata = (data.user.user_metadata ?? {}) as Record<string, unknown>;
    const { data: isEditor, error: editorError } = await supabase.rpc('is_editor');
    if (editorError) {
      console.error('Could not read the editor allowlist:', editorError.message);
    }

    let isEditorInChief = false;
    if (isEditor === true) {
      const chiefResult = await supabase.rpc('is_editor_in_chief');
      if (chiefResult?.error) {
        console.error('Could not read the editor-in-chief role:', chiefResult.error.message);
      } else {
        isEditorInChief = chiefResult?.data === true;
      }
    }

    return {
      id: data.user.id,
      email: data.user.email ?? '',
      name: displayName(data.user.email ?? undefined, metadata),
      isEditor: isEditor === true,
      isEditorInChief,
    };
  } catch (error) {
    console.error('Could not read the Supabase session:', error);
    return null;
  }
}

/**
 * Guard for studio APIs and loaders. Node-local demo mode keeps working
 * without any credentials; an unconfigured Pages deployment fails closed with
 * 503 instead of silently granting access.
 */
export async function requireEditor(ctx: RequestContext): Promise<EditorGate> {
  if (!isPublicConfigValid(ctx.config)) {
    if (ctx.runtime === 'node-local') {
      return { ok: true, user: null, mode: 'local' };
    }
    return { ok: false, status: 503, error: 'Sign-in is not configured on this deployment.' };
  }

  const user = await getDashboardUser(ctx);
  if (!user) {
    return { ok: false, status: 401, error: 'Sign in to the editorial studio to continue.' };
  }
  if (!user.isEditor) {
    return {
      ok: false,
      status: 403,
      error: 'This account does not have editor access. Ask an administrator to add it.',
    };
  }

  return { ok: true, user, mode: 'supabase' };
}

// ---------------------------------------------------------------------------
// PKCE auth callback — behavioural parity with app/auth/callback/route.ts:
// safe `next`, provider-error passthrough, no-store on every outcome, session
// cookies written via the request's cookie jar.
// ---------------------------------------------------------------------------

function callbackParam(request: Request, name: string): string | null {
  return new URL(request.url).searchParams.get(name);
}

export async function handleAuthCallback(ctx: RequestContext): Promise<Response> {
  const origin = new URL(ctx.config.siteUrl).origin;
  const next = safeNextPath(callbackParam(ctx.request, 'next'), '/');

  const loginUrl = new URL('/login', origin);
  loginUrl.searchParams.set('next', next);
  const failure = (message: string) => {
    loginUrl.searchParams.set('error_description', message);
    return new Response(null, {
      status: 307,
      headers: { location: loginUrl.toString(), 'cache-control': 'no-store' },
    });
  };

  const providerError =
    callbackParam(ctx.request, 'error_description') ?? callbackParam(ctx.request, 'error');
  if (providerError) return failure(providerError);
  if (!isPublicConfigValid(ctx.config)) {
    return failure('Supabase is not configured. Contact the site administrator.');
  }

  const code = callbackParam(ctx.request, 'code');
  if (!code) {
    return failure('The sign-in response was missing its authorization code. Please try again.');
  }

  const destination = new URL(next, origin);
  const redirect = () =>
    new Response(null, {
      status: 307,
      headers: { location: destination.toString(), 'cache-control': 'no-store' },
    });

  try {
    const supabase = sessionClientFor(ctx);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return failure(
        'Sign-in could not be completed. The link may have expired or been opened in a different browser. Please try again.',
      );
    }
    // Session cookies were written into the jar by the exchange; the dispatcher flushes them.
    return redirect();
  } catch (error) {
    console.error('The sign-in service could not be reached:', error);
    return failure('The sign-in service could not be reached. Try again in a moment.');
  }
}
