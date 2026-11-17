import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase/config';
import { markdownRoute, wantsMarkdown } from '@/lib/markdown-negotiation';

function attachTraceHeaders(request: NextRequest, response: NextResponse): NextResponse {
  const incomingReqId = request.headers.get('x-request-id')?.trim();
  const incomingTrace =
    request.headers.get('x-trace-id')?.trim() ?? request.headers.get('traceparent')?.trim();
  const requestId = incomingReqId && incomingReqId.length <= 128 ? incomingReqId : `req_${crypto.randomUUID()}`;
  const traceId = incomingTrace && incomingTrace.length <= 128 ? incomingTrace : `tr_${crypto.randomUUID().slice(0, 16)}`;
  response.headers.set('X-Request-Id', requestId);
  response.headers.set('X-Trace-Id', traceId);
  return response;
}

/**
 * Negotiates Markdown for public catalogue pages, attaches W3C/request trace
 * headers (Part V §13.1 / §18.15), and protects the editorial studio while
 * refreshing its Supabase session cookie. Public & API requests never trigger
 * a session lookup in middleware.
 */
export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return attachTraceHeaders(request, NextResponse.next());
  }

  if (markdownRoute(request.nextUrl.pathname)) {
    if ((request.method === 'GET' || request.method === 'HEAD') && wantsMarkdown(request.headers.get('accept'))) {
      const url = request.nextUrl.clone();
      url.pathname = '/agent-markdown';
      const response = NextResponse.rewrite(url);
      response.headers.append('Vary', 'Accept');
      return attachTraceHeaders(request, response);
    }
    const response = NextResponse.next();
    response.headers.append('Vary', 'Accept');
    return attachTraceHeaders(request, response);
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return attachTraceHeaders(request, NextResponse.next());
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
    return attachTraceHeaders(request, NextResponse.redirect(loginUrl));
  }

  return attachTraceHeaders(request, response);
}

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*', '/', '/post/:path*', '/category/:path*'],
};
