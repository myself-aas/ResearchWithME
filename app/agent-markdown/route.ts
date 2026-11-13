import { NextRequest } from 'next/server';
import { getCachedArticleCatalogue } from '@/lib/cms/catalogue';
import { markdownResponse, markdownRoute, renderMarkdown, wantsMarkdown } from '@/lib/markdown-negotiation';
import { SITE_URL } from '@/lib/seo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function respond(request: NextRequest) {
  // Next's rewrite keeps the original request URL in the route handler. Use
  // that pathname, not query parameters from the destination URL (which are
  // not reflected in request.nextUrl after a middleware rewrite).
  const pathname = request.nextUrl.pathname;
  // This is an internal rewrite target, but direct requests must not turn it
  // into a generic authenticated-page-to-Markdown converter.
  if (!markdownRoute(pathname) || !wantsMarkdown(request.headers.get('accept'))) {
    return new Response('Not found.\n', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    const posts = await getCachedArticleCatalogue();
    const text = renderMarkdown(pathname, request.nextUrl.searchParams.get('search') ?? '', posts, SITE_URL);
    return markdownResponse(text, request.method);
  } catch (error) {
    console.error('Could not render the public Markdown representation:', error);
    return new Response('The archive could not be read.\n', {
      status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', Vary: 'Accept' },
    });
  }
}

export const GET = respond;
export const HEAD = respond;
