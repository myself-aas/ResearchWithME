import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createSupabaseServerClient } from '@/lib/supabase/server';
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

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return failTo('That sign-in link has expired or was already used. Start the sign-in again.');
    }
  } catch (error) {
    console.error('OAuth code exchange failed:', error);
    return failTo('The sign-in service could not be reached. Try again in a moment.');
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
