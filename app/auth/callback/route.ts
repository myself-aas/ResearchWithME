import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from '@/lib/supabase/config';
import { safeNextPath } from '@/lib/safe-redirect';

export const dynamic = 'force-dynamic';

/**
 * Landing point for every Supabase sign-in redirect: Google, GitHub, and email
 * links. The PKCE code is exchanged here on the server so the session cookie is
 * set before the reader reaches `next`, including middleware-protected routes.
 * Failures go to /login, which shows the provider's message.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNextPath(url.searchParams.get('next'), '/');

  const failTo = (message: string) => {
    const target = new URL('/login', url.origin);
    target.searchParams.set('error_description', message);
    target.searchParams.set('next', next);
    return NextResponse.redirect(target);
  };

  const providerError = url.searchParams.get('error_description') ?? url.searchParams.get('error');
  if (providerError) return failTo(providerError);

  if (!isSupabaseConfigured) {
    return NextResponse.redirect(new URL('/auth/providers', url.origin));
  }

  const code = url.searchParams.get('code');
  if (!code) return failTo('The sign-in response was missing its authorization code. Start the sign-in again.');

  const forwardedHost = request.headers.get('x-forwarded-host');
  const isLocalEnv = process.env.NODE_ENV === 'development';
  const redirectTarget = isLocalEnv
    ? new URL(next, url.origin)
    : forwardedHost
      ? new URL(next, `https://${forwardedHost}`)
      : new URL(next, url.origin);

  const response = NextResponse.redirect(redirectTarget);

  try {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('OAuth code exchange failed:', error);
      return failTo(error.message || 'That sign-in link has expired or was already used. Start the sign-in again.');
    }
  } catch (error) {
    console.error('OAuth code exchange exception:', error);
    return failTo('The sign-in service could not be reached. Try again in a moment.');
  }

  return response;
}
