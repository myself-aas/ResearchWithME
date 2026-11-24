/**
 * Machine-readable error representations (RFC 9457 `application/problem+json`).
 *
 * The HTML error pages stay human-readable; this route is the representation a
 * client asking for JSON or markdown gets instead, advertised from the HTML
 * pages with `<link rel="alternate">`. Nothing here returns `406` for an
 * unsupported `Accept` — an error response that refuses to explain itself is
 * worse than a slightly mismatched content type.
 */
export const dynamic = 'force-static';

const STATUS_TEXT: Record<number, { title: string; detail: string; retryable: boolean }> = {
  404: {
    title: 'Not found',
    detail: 'No page or essay exists at this address. The archive at /blog lists everything published.',
    retryable: false,
  },
  429: {
    title: 'Too many requests',
    detail: 'This client is sending requests faster than the site accepts. Retry after the delay.',
    retryable: true,
  },
  500: {
    title: 'Internal error',
    detail: 'The request failed while rendering. It is safe to retry.',
    retryable: true,
  },
  503: {
    title: 'Temporarily unavailable',
    detail: 'The site is briefly unable to serve this request. Retry after the delay.',
    retryable: true,
  },
};

const SUPPORTED = Object.keys(STATUS_TEXT).map(Number);

export function generateStaticParams() {
  return SUPPORTED.map((status) => ({ status: String(status) }));
}

export const dynamicParams = false;

export async function GET(request: Request, { params }: { params: Promise<{ status: string }> }) {
  const { status: raw } = await params;
  const status = Number(raw);
  const info = STATUS_TEXT[status];

  if (!info) {
    return new Response(JSON.stringify({ type: 'about:blank', title: 'Unsupported error code', status: 400 }), {
      status: 400,
      headers: { 'Content-Type': 'application/problem+json; charset=utf-8' },
    });
  }

  const accept = request.headers.get('accept') ?? '';
  const base = new URL(request.url).origin;
  const headers: Record<string, string> = {
    Vary: 'Accept',
    'Cache-Control': status === 404 ? 'public, max-age=300' : 'no-store',
  };

  if (info.retryable) headers['Retry-After'] = '60';

  if (accept.includes('text/markdown')) {
    headers['Content-Type'] = 'text/markdown; charset=utf-8';
    const markdown = [
      `# ${status} ${info.title}`,
      '',
      info.detail,
      '',
      `- Type: \`${base}/errors/${status}\``,
      `- Retryable: ${info.retryable ? 'yes' : 'no'}`,
      ...(info.retryable ? ['- Retry after: 60 seconds'] : []),
      '',
      'Everything published is listed at /blog, and /sitemap.xml lists every canonical URL.',
      '',
    ].join('\n');
    return new Response(markdown, { status, headers });
  }

  headers['Content-Type'] = 'application/problem+json; charset=utf-8';
  const problem = {
    type: `${base}/errors/${status}`,
    title: info.title,
    status,
    detail: info.detail,
    instance: request.url,
    retryable: info.retryable,
    ...(info.retryable ? { retryAfter: 60 } : {}),
  };
  return new Response(JSON.stringify(problem, null, 2), { status, headers });
}
