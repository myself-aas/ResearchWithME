import { NextResponse, type NextRequest } from 'next/server';

/**
 * Content negotiation for agents.
 *
 * Requests that include `Accept: text/markdown` get a markdown
 * representation of the page (Cloudflare's "Markdown for Agents" output
 * contract, applied at the application so it works regardless of zone-level
 * conversion). Requests without the header — browsers — get the HTML that
 * was already going to be served, untouched.
 *
 * Next 15 middleware cannot read the outgoing response, so the conversion
 * happens in the internal `/api/agent-markdown` route handler: this
 * middleware rewrites agent requests there, forwarding the original
 * target in a request header, and that route fetches the page as plain
 * HTML and returns the markdown representation with the contract headers.
 *
 * Non-HTML targets (the machine-readable routes llms.txt, feed.json,
 * rss.xml, sitemap, robots, security.txt, the per-essay `/markdown`
 * routes, static assets, `/api/`, `/mcp` (the MCP JSON-RPC endpoint), and `.md` files — which are already
 * Markdown and must be served byte-exact, e.g. the Agent Skills
 * discovery artifacts under `/.well-known/agent-skills/`) are left alone
 * by the matcher.
 */

/** True when `text/markdown` is offered in the Accept header. */
export function wantsMarkdown(accept: string | null | undefined): boolean {
  if (!accept) return false;
  return accept
    .split(',')
    .map((part) => part.trim().split(';')[0].trim().toLowerCase())
    .some((media) => media === 'text/markdown');
}

/**
 * Internal route that performs the actual conversion. The marker header
 * keeps a rewritten request from being rewritten again if the matcher
 * config ever drifts.
 */
const INTERNAL_ROUTE = '/api/agent-markdown';
const INTERNAL_MARKER = 'x-internal-agent-markdown';
/** Request header carrying the original target path + search. */
const TARGET_HEADER = 'x-agent-markdown-target';

export async function middleware(request: NextRequest) {
  if (!wantsMarkdown(request.headers.get('accept'))) {
    return NextResponse.next();
  }

  // Never rewrite the internal conversion route back to itself.
  if (request.nextUrl.pathname === INTERNAL_ROUTE || request.headers.get(INTERNAL_MARKER)) {
    return NextResponse.next();
  }

  // Forward the original target on the rewritten request. Headers set on
  // the middleware response are copied onto the forwarded request by the
  // server (except forbidden ones), so the internal route can read it.
  const target = request.nextUrl.pathname + request.nextUrl.search;
  const rewrite = NextResponse.rewrite(new URL(INTERNAL_ROUTE, request.nextUrl.origin));
  rewrite.headers.set(TARGET_HEADER, target);
  return rewrite;
}

export const config = {
  matcher: [
    '/((?!_next/(?:static|image|data|chunks)|api/|mcp(?:/|$)|.*\\.(?:png|jpe?g|gif|webp|avif|svg|ico|css|js|mjs|woff2?|ttf|eot|json|xml|txt|webmanifest|md)$).*)',
  ],
};
