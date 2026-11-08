import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from '@/lib/supabase/config';
import { safeNextPath } from '@/lib/safe-redirect';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const next = safeNextPath(request.nextUrl.searchParams.get('next'), '/');
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', next);
  const failure = (message: string) => {
    loginUrl.searchParams.set('error_description', message);
    const response = NextResponse.redirect(loginUrl);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  };

  const providerError = request.nextUrl.searchParams.get('error_description') ?? request.nextUrl.searchParams.get('error');
  if (providerError) return failure(providerError);
  if (!isSupabaseConfigured) return failure('Supabase is not configured. Contact the site administrator.');

  const code = request.nextUrl.searchParams.get('code');
  if (!code) return failure('The sign-in response was missing its authorization code. Please try again.');

  const response = NextResponse.redirect(new URL(next, request.url));
  response.headers.set('Cache-Control', 'no-store');
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return failure('Sign-in could not be completed. The link may have expired or been opened in a different browser. Please try again.');
    return response;
  } catch {
    return failure('The sign-in service could not be reached. Try again in a moment.');
  }
}
