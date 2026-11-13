import type { HttpMethod, RequestContext } from '../context';
import { articlesRoutes } from './articles';
import { authorsRoutes } from './authors';
import { papersRoutes } from './papers';
import { commentsRoutes } from './comments';
import { cmsPostsRoutes } from './cms-posts';
import { cmsCommentsRoutes } from './cms-comments';
import { applicationsRoutes } from './applications';
import { assistantRoutes } from './assistant';
import { revalidateRoutes } from './revalidate';

export type ApiHandler = (ctx: RequestContext, params: Record<string, string>) => Promise<Response>;
export interface ApiRoute {
  path: string;
  handlers: Partial<Record<HttpMethod, ApiHandler>>;
}

/** JSON helper matching the Next route handlers' content-type exactly. */
export function json(
  data: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(JSON.stringify(data), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json', ...init.headers },
  });
}

export const API_ROUTES: readonly ApiRoute[] = [
  ...articlesRoutes,
  ...authorsRoutes,
  ...papersRoutes,
  ...commentsRoutes,
  ...cmsPostsRoutes,
  ...cmsCommentsRoutes,
  ...applicationsRoutes,
  ...assistantRoutes,
  ...revalidateRoutes,
];

const METHOD_ORDER: readonly HttpMethod[] = ['GET', 'POST', 'PATCH', 'DELETE'];
const SEGMENT_LIMIT = 256;

function splitPath(pathname: string): string[] {
  return pathname.split('/').filter(Boolean);
}

/**
 * Allow header, Next-compatible ordering for the all-GET case:
 * "GET, HEAD, OPTIONS". Unknown methods appended after.
 */
function allowHeader(route: ApiRoute): string {
  const allow: string[] = [];
  for (const method of METHOD_ORDER) {
    if (!route.handlers[method]) continue;
    allow.push(method);
    if (method === 'GET') allow.push('HEAD');
  }
  allow.push('OPTIONS');
  return allow.join(', ');
}

type Match = { route: ApiRoute; params: Record<string, string> } | null;

function matchApiRoute(pathname: string): Match | 'invalid' {
  const segments = splitPath(pathname);
  for (const route of API_ROUTES) {
    const pattern = splitPath(route.path);
    if (pattern.length !== segments.length) continue;
    const params: Record<string, string> = {};
    let matched = true;
    for (let index = 0; index < pattern.length; index += 1) {
      const token = pattern[index];
      if (token.startsWith(':')) {
        let value: string;
        try {
          value = decodeURIComponent(segments[index]);
        } catch {
          // A parameter that cannot be decoded is a client error, not a 500.
          return 'invalid';
        }
        params[token.slice(1)] = value.slice(0, SEGMENT_LIMIT);
      } else if (token !== segments[index]) {
        matched = false;
        break;
      }
    }
    if (matched) return { route, params };
  }
  return null;
}

/**
 * Resolves an /api/* request to its handler. Returns null when the path
 * matches no route (the caller falls back to the page renderer/404).
 * Implements the baseline's behavior: HEAD rides the GET handler with an
 * empty body, OPTIONS answers 204 with Allow, and a known path reached with
 * an unregistered method answers 405 with Allow.
 */
export async function dispatchApi(ctx: RequestContext): Promise<Response | null> {
  const { pathname } = new URL(ctx.request.url);
  if (!pathname.startsWith('/api/')) return null;

  const match = matchApiRoute(pathname);
  if (match === 'invalid') {
    return json({ error: 'The route parameters could not be decoded.' }, { status: 400 });
  }
  if (!match) return null;

  const { route, params } = match;
  const method = ctx.request.method.toUpperCase();

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { allow: allowHeader(route) } });
  }

  const effectiveMethod = method === 'HEAD' ? 'GET' : (method as HttpMethod);
  const handler = route.handlers[effectiveMethod];
  if (!handler) {
    return json(
      { error: 'Method not allowed.' },
      { status: 405, headers: { allow: allowHeader(route) } },
    );
  }

  const response = await handler(ctx, params);
  if (method === 'HEAD') {
    // Body stripped, status/headers preserved — matches HEAD /api/articles.
    return new Response(null, { status: response.status, headers: new Headers(response.headers) });
  }
  return response;
}
