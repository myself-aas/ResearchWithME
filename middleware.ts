import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase/config';
import { markdownRoute, wantsMarkdown } from '@/lib/markdown-negotiation';

/**
 * Negotiates Markdown for public catalogue pages, and protects the editorial
 * studio while refreshing its Supabase session cookie. Public requests never
 * trigger a session lookup. With no Supabase credentials the studio remains in
 * local demo mode; configured /dashboard requests require sign-in.
 */
export async function middleware(request: NextRequest) {
  if (markdownRoute(request.nextUrl.pathname)) {
    if ((request.method === 'GET' || request.method === 'HEAD') && wantsMarkdown(request.headers.get('accept'))) {
      const url = request.nextUrl.clone();
      url.pathname = '/agent-markdown';
      const response = NextResponse.rewrite(url);
      response.headers.append('Vary', 'Accept');
      return response;
    }
    const response = NextResponse.next();
    response.headers.append('Vary', 'Accept');
    return response;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = '';
    loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/', '/post/:path*', '/category/:path*'],
};
