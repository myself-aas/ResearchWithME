/**
 * Secure client-loader transport (`GET /__data`).
 *
 * The browser data routers ask this endpoint for a route's loader data
 * instead of fetching the route's own URL. The handler:
 *
 *   1. accepts only GET;
 *   2. requires `routeId` (one of the known, matched RouteIds) and a `url`
 *      that must resolve to a same-origin relative path — absolute,
 *      protocol-relative, `javascript:` and backslash URLs are rejected;
 *   3. verifies the supplied URL actually matches `routeId` in the shared
 *      route table (mismatches are 400, never a loader run);
 *   4. calls `queryRoute` in-process — the supplied URL is never fetched;
 *   5. encodes data, redirects and errors as a `RouteEnvelope` and always
 *      answers `no-store` JSON.
 *
 * Refreshed session cookies propagate via `ctx.cookies`, which the dispatcher
 * applies to every response. Protected child loaders MUST re-check auth
 * themselves: parent and child loaders can run in parallel, and
 * `queryRoute` can invoke a child alone.
 */
import { matchRoutes, redirect, type LoaderFunction, type RouteObject } from 'react-router-dom';
import { createStaticHandler } from 'react-router-dom/server';
import type { RequestContext } from './context';
import { loadPublicRoute } from './loaders/public';
import {
  ROUTE_DEFINITIONS,
  createAppRoutes,
  defaultStatusText,
  type JsonValue,
  type LoaderMap,
  type RouteEnvelope,
  type RouteId,
} from '../routes';

export const ROUTE_DATA_PATH = '/__data';

const KNOWN_ROUTE_IDS = new Set<string>(ROUTE_DEFINITIONS.map((definition) => definition.id));
const MATCH_ORIGIN = 'http://route-data.invalid';
const MAX_URL_LENGTH = 2048;
const MAX_TEXT_PAYLOAD = 1000;

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/**
 * Server loaders bound to this request's context. Each public loader talks
 * to the request-scoped stores only; the browser twin for these routes calls
 * `/__data` (see createBrowserRoutes). Studio loaders land in Task 13.
 */
function serverLoaders(ctx: RequestContext): LoaderMap {
  const publicLoader =
    (routeId: RouteId): LoaderFunction =>
    ({ params }) =>
      loadPublicRoute(ctx, routeId, params) as Promise<JsonValue>;

  return {
    home: publicLoader('home'),
    articles: () => redirect('/', 308),
    category: publicLoader('category'),
    post: publicLoader('post'),
    paper: publicLoader('paper'),
    author: publicLoader('author'),
    papers: publicLoader('papers'),
    authors: publicLoader('authors'),
    editions: publicLoader('editions'),
    'editorial-board': publicLoader('editorial-board'),
    assistant: publicLoader('assistant'),
    bookmarks: publicLoader('bookmarks'),
    cite: publicLoader('cite'),
    'api-docs': publicLoader('api-docs'),
    about: publicLoader('about'),
    contact: publicLoader('contact'),
    privacy: publicLoader('privacy'),
  };
}

export function createServerRoutes(ctx: RequestContext): RouteObject[] {
  return createAppRoutes(serverLoaders(ctx));
}

// ---------------------------------------------------------------------------
// Serialization helpers (shared with the SSR document)
// ---------------------------------------------------------------------------

export function toSerializableJson(value: unknown, seen: WeakSet<object> = new WeakSet(), depth = 0): JsonValue {
  if (value === null) return null;
  const type = typeof value;
  if (type === 'string') return value as string;
  if (type === 'boolean') return value as boolean;
  if (type === 'number') return Number.isFinite(value as number) ? (value as number) : null;
  if (type !== 'object') return null; // undefined, functions, symbols, bigint
  if (depth > 32) return null;
  if (seen.has(value as object)) return null;
  seen.add(value as object);
  if (Array.isArray(value)) {
    return value.map((entry) => toSerializableJson(entry, seen, depth + 1));
  }
  const out: Record<string, JsonValue> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (entry === undefined) continue;
    out[key] = toSerializableJson(entry, seen, depth + 1);
  }
  return out;
}

export interface SerializedRouteError {
  status: number;
  statusText: string;
  internal: boolean;
  data: JsonValue;
}

function clampErrorStatus(status: unknown): number {
  if (typeof status === 'number' && Number.isFinite(status) && status >= 400 && status <= 599) {
    return Math.floor(status);
  }
  return 500;
}

/**
 * Maps anything a loader threw/returned (thrown Response, error result, plain
 * Error) onto a JSON-safe shape. Plain Errors collapse to a generic message —
 * internals (SQL, hosts, secrets) must never cross the transport.
 */
export function serializeRouteError(error: unknown): SerializedRouteError {
  const err = (error ?? {}) as {
    status?: unknown;
    statusText?: unknown;
    internal?: unknown;
    data?: unknown;
  };
  const status = clampErrorStatus(err.status);
  const statusText =
    typeof err.statusText === 'string' && err.statusText.trim() ? err.statusText : defaultStatusText(status);
  const internal = typeof err.internal === 'boolean' ? err.internal : false;
  const data: JsonValue =
    'data' in err && err.data !== undefined
      ? toSerializableJson(err.data)
      : { message: status >= 500 ? 'Unexpected server error' : defaultStatusText(status) };
  return { status, statusText, internal, data };
}

/** Allows only same-origin paths and http(s) absolute URLs to be used as redirect targets. */
export function sanitizeRedirectLocation(location: string | null): string | null {
  if (!location) return null;
  if (/[\u0000-\u001f\u007f]/.test(location)) return null;
  if (location.startsWith('/')) {
    return location.startsWith('//') ? null : location;
  }
  try {
    const parsed = new URL(location);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Envelope plumbing
// ---------------------------------------------------------------------------

function envelopeResponse(envelope: RouteEnvelope, httpStatus = 200, extraHeaders?: HeadersInit): Response {
  const headers = new Headers(extraHeaders);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(envelope), { status: httpStatus, headers });
}

function errorEnvelope(httpStatus: number, message: string): RouteEnvelope {
  return { kind: 'error', status: httpStatus, data: { message } };
}

function redirectEnvelope(location: string, status: number): RouteEnvelope {
  const safe = sanitizeRedirectLocation(location);
  if (!safe) return { kind: 'error', status: 500, data: { message: 'Unsafe redirect location.' } };
  const redirectStatus = REDIRECT_STATUSES.has(status) ? (status as 301 | 302 | 303 | 307 | 308) : 302;
  return { kind: 'redirect', location: safe, status: redirectStatus };
}

function isRedirectStatus(status: number): boolean {
  return REDIRECT_STATUSES.has(status);
}

async function readCappedText(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, MAX_TEXT_PAYLOAD);
  } catch {
    return '';
  }
}

/** A Response an in-process loader produced or threw — never the client's URL. */
async function envelopeFromLoaderResponse(response: Response): Promise<RouteEnvelope> {
  const location = response.headers.get('location');
  if (isRedirectStatus(response.status) && location) {
    return redirectEnvelope(location, response.status);
  }
  const text = await readCappedText(response);
  if (response.status >= 200 && response.status < 300) {
    return { kind: 'data', data: text === '' ? null : text };
  }
  const payload = text !== '' ? text : defaultStatusText(response.status);
  return { kind: 'error', status: clampErrorStatus(response.status), data: payload };
}

interface ParsedRouteDataRequest {
  routeId: RouteId;
  pathname: string;
  search: string;
}

function parseRouteDataRequest(searchParams: URLSearchParams): ParsedRouteDataRequest | { error: string } {
  const routeId = (searchParams.get('routeId') ?? '').trim();
  const rawUrl = searchParams.get('url') ?? '';

  if (!routeId || !rawUrl) return { error: 'Missing routeId or url.' };
  if (!KNOWN_ROUTE_IDS.has(routeId)) return { error: 'Unknown routeId.' };
  if (rawUrl.length > MAX_URL_LENGTH) return { error: 'url is too long.' };
  // Control characters and backslashes enable parser-disagreement attacks;
  // reject them before any URL parsing happens.
  if (/[\u0000-\u001f\u007f\\]/.test(rawUrl)) return { error: 'url contains illegal characters.' };

  let parsed: URL;
  try {
    // Resolve against a fixed dummy origin so absolute and protocol-relative
    // URLs fail the same-origin comparison below uniformly.
    parsed = new URL(rawUrl, MATCH_ORIGIN);
  } catch {
    return { error: 'url could not be parsed.' };
  }
  if (parsed.origin !== MATCH_ORIGIN) {
    return { error: 'url must be a same-origin relative path.' };
  }
  return { routeId: routeId as RouteId, pathname: parsed.pathname, search: parsed.search };
}

export async function handleRouteData(ctx: RequestContext): Promise<Response> {
  if (ctx.request.method !== 'GET') {
    return envelopeResponse(errorEnvelope(405, 'Method Not Allowed'), 405, { allow: 'GET' });
  }

  const requestUrl = new URL(ctx.request.url);
  const parsed = parseRouteDataRequest(requestUrl.searchParams);
  if ('error' in parsed) {
    return envelopeResponse(errorEnvelope(400, parsed.error), 400);
  }

  const routes = createServerRoutes(ctx);
  const location = { pathname: parsed.pathname, search: parsed.search, hash: '', state: null, key: 'route-data' };
  const matches = matchRoutes(routes, location) ?? [];
  const matchedIds = matches.map((match) => match.route?.id);
  if (!matchedIds.includes(parsed.routeId)) {
    return envelopeResponse(
      errorEnvelope(400, `routeId "${parsed.routeId}" does not match ${parsed.pathname}.`),
      400,
    );
  }

  const matched = matches.find((match) => match.route?.id === parsed.routeId);
  const matchedLoader = (matched?.route as RouteObject | undefined)?.loader as LoaderFunction | undefined;
  if (!matchedLoader) {
    return envelopeResponse({ kind: 'data', data: null });
  }

  // queryRoute runs the loader in-process; the request is constructed from
  // the validated path and never leaves the process.
  const dataRequest = new Request(new URL(parsed.pathname + parsed.search, requestUrl.origin), {
    method: 'GET',
    headers: { accept: 'application/json' },
  });
  const staticHandler = createStaticHandler(routes);

  try {
    const result = await staticHandler.queryRoute(dataRequest, { routeId: parsed.routeId });
    if (result instanceof Response) {
      return envelopeResponse(await envelopeFromLoaderResponse(result));
    }
    return envelopeResponse({ kind: 'data', data: toSerializableJson(result ?? null) });
  } catch (error) {
    if (error instanceof Response) {
      return envelopeResponse(await envelopeFromLoaderResponse(error));
    }
    const serialized = serializeRouteError(error);
    return envelopeResponse({ kind: 'error', status: serialized.status, data: serialized.data });
  }
}
