import { NextResponse, type NextRequest } from 'next/server';
import { htmlToAgentMarkdown } from '@/lib/agents/markdown';

/**
 * Internal conversion endpoint for the "Markdown for Agents" content
 * negotiation. `middleware.ts` rewrites requests with `Accept:
 * text/markdown` here, forwarding the original target in the
 * `x-agent-markdown-target` request header; this handler fetches the
 * original page as plain HTML from the same origin and returns the
 * markdown representation with the Cloudflare output-contract headers.
 *
 * The upstream fetch deliberately sends `Accept: text/html` (browser
 * behavior), so the middleware leaves it untouched.
 */

/** Request header carrying the original target path + search. */
const TARGET_HEADER = 'x-agent-markdown-target';

/** Headers that describe the original HTML body and must be dropped. */
const BODY_DESCRIBING_HEADERS = [
  'content-length',
  'content-encoding',
  'content-range',
  'transfer-encoding',
  'etag',
  'last-modified',
];

export async function GET(request: NextRequest) {
  const target = request.headers.get(TARGET_HEADER);
  if (!target || !target.startsWith('/')) {
    return new NextResponse('Missing or invalid target.', { status: 400 });
  }

  // Resolve against the incoming request's own origin so the internal
  // route works identically in dev and on the deployed Worker.
  const url = new URL(target, request.nextUrl.origin);

  const upstream = await fetch(url, {
    headers: {
      // Browser-style request: middleware must not rewrite this fetch.
      accept: 'text/html,application/xhtml+xml',
      'x-internal-agent-markdown': '1',
    },
    redirect: 'follow',
  });

  const contentType = upstream.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html')) {
    // Nothing to convert — pass the upstream response through untouched.
    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: upstream.headers,
    });
  }

  const html = await upstream.text();
  const { markdown, tokens } = htmlToAgentMarkdown(html);

  const headers = new Headers(upstream.headers);
  headers.set('content-type', 'text/markdown; charset=utf-8');
  const vary = headers.get('vary');
  headers.set('vary', vary ? `${vary}, Accept` : 'Accept');
  for (const name of BODY_DESCRIBING_HEADERS) headers.delete(name);
  headers.set('x-markdown-tokens', String(tokens));

  return new NextResponse(markdown, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}
