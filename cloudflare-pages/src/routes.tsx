import { useEffect, type CSSProperties, type ReactElement, type ReactNode } from 'react';
import {
  isRouteErrorResponse,
  Link,
  redirect,
  useMatches,
  useRouteError,
  type LoaderFunction,
  type LoaderFunctionArgs,
  type RouteObject,
} from 'react-router-dom';
import NotFound from './not-found';
import HomeRoute from './routes/home';
import CategoryRoute from './routes/category';
import PostRoute from './routes/post';
import PaperRoute from './routes/paper';
import AuthorRoute from './routes/author';
import PapersRoute from './routes/papers';
import AuthorsRoute from './routes/authors';
import EditionsRoute from './routes/editions';
import EditorialBoardRoute from './routes/editorial-board';
import AssistantRoute from './routes/assistant';
import BookmarksRoute from './routes/bookmarks';
import CiteRoute from './routes/cite';
import ApiDocsRoute from './routes/api-docs';
import AboutRoute from './routes/about';
import ContactRoute from './routes/contact';
import PrivacyRoute from './routes/privacy';

/**
 * Shared route table for the Pages target (Task 10).
 *
 * Route IDs and elements are shared between the SSR renderer and the browser
 * bundle; server loader code is NOT shared — the browser loaders call the
 * secure `/__data` transport (see server/route-data.ts) and React Router
 * re-runs them in-process on the server. Pages-only module: the Next app
 * never imports it.
 */

export type RouteId =
  | 'root'
  | 'not-found'
  | 'dashboard-layout'
  | 'home'
  | 'articles'
  | 'category'
  | 'post'
  | 'papers'
  | 'paper'
  | 'authors'
  | 'author'
  | 'editions'
  | 'editorial-board'
  | 'assistant'
  | 'bookmarks'
  | 'cite'
  | 'api-docs'
  | 'about'
  | 'contact'
  | 'privacy'
  | 'login'
  | 'write'
  | 'dashboard'
  | 'dashboard-access'
  | 'dashboard-manage'
  | 'dashboard-edit'
  | 'dashboard-comments'
  | 'dashboard-applications';

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

/** Transport contract between `/__data` and the browser loaders. */
export type RouteEnvelope =
  | { kind: 'data'; data: JsonValue }
  | { kind: 'redirect'; location: string; status: 301 | 302 | 303 | 307 | 308 }
  | { kind: 'error'; status: number; data: JsonValue };

export type LoaderMap = Partial<Record<RouteId, LoaderFunction>>;

/** window key carrying the SSR loader state into the hydrated router. */
export const HYDRATION_DATA_KEY = '__RWM_HYDRATION__';

const homeStyles: Record<string, CSSProperties> = {
  main: {
    fontFamily: 'Georgia, "Times New Roman", serif',
    maxWidth: '42rem',
    margin: '0 auto',
    padding: '6rem 1.5rem',
    color: '#161C1A',
  },
  eyebrow: {
    fontSize: '0.75rem',
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: '#4F46E5',
    margin: 0,
  },
  wordmark: {
    fontSize: '3.25rem',
    lineHeight: 1.05,
    letterSpacing: '-0.03em',
    margin: '1rem 0 1.25rem',
  },
  strap: {
    fontSize: '1.125rem',
    lineHeight: 1.6,
    color: '#3F4542',
    margin: 0,
  },
};

function RouteErrorBoundary() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : 500;
  const heading = status === 404 ? 'Page not found' : status >= 500 ? 'Something went wrong' : 'Request failed';
  const detail =
    status === 404
      ? 'The page you were looking for does not exist or was moved.'
      : 'The journal hit an unexpected error. Please try again in a moment.';

  return (
    <main style={homeStyles.main}>
      <p style={homeStyles.eyebrow}>Error {status}</p>
      <h1 style={homeStyles.wordmark}>{heading}</h1>
      <p style={homeStyles.strap}>{detail}</p>
      <p style={{ marginTop: '2rem' }}>
        <Link to="/" style={{ color: '#4F46E5' }}>
          Back to the journal
        </Link>
      </p>
    </main>
  );
}

/**
 * Fallback <title> for client-side navigations to routes without metadata
 * (kept in sync with server/metadata.ts DEFAULT_TITLE; the Pages bundle
 * must not import server modules).
 */
const FALLBACK_TITLE = 'ResearchWithMe · Applied AI research, published openly';
const MAX_TITLE_LENGTH = 300;

/** Loader-data envelope every public route shares (see routes/data.ts). */
interface LoaderMetadataShape {
  metadata?: { title?: unknown };
}

/**
 * Keeps document.title in step with the matched routes during client-side
 * navigations. The SSR document emits <title> from the same metadata for
 * full document loads; effects never run during SSR.
 */
function DocumentTitleSync({ children }: { children: ReactNode }) {
  const matches = useMatches();

  useEffect(() => {
    // Deepest match wins — the same rule the document renderer applies.
    for (let index = matches.length - 1; index >= 0; index -= 1) {
      const data = matches[index]?.data as LoaderMetadataShape | undefined;
      const title = data?.metadata?.title;
      if (typeof title === 'string' && title.trim()) {
        document.title = title.replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE_LENGTH);
        return;
      }
    }
    document.title = FALLBACK_TITLE;
  }, [matches]);

  return <>{children}</>;
}

interface RouteDefinition {
  id: RouteId;
  path: string;
  element: ReactElement;
}

/**
 * The route table. Tasks 11–13 extend it as the ported pages land. Explicit
 * ids keep loader-data keys stable across the transport boundary.
 */
export const ROUTE_DEFINITIONS: ReadonlyArray<RouteDefinition> = [
  { id: 'home', path: '/', element: <HomeRoute /> },
  { id: 'articles', path: '/articles', element: <HomeRoute /> },
  { id: 'category', path: '/category/:slug', element: <CategoryRoute /> },
  { id: 'post', path: '/post/:slug', element: <PostRoute /> },
  { id: 'paper', path: '/paper/:slug', element: <PaperRoute /> },
  { id: 'author', path: '/author/:id', element: <AuthorRoute /> },
  { id: 'papers', path: '/papers', element: <PapersRoute /> },
  { id: 'authors', path: '/authors', element: <AuthorsRoute /> },
  { id: 'editions', path: '/editions', element: <EditionsRoute /> },
  { id: 'editorial-board', path: '/editorial-board', element: <EditorialBoardRoute /> },
  { id: 'assistant', path: '/assistant', element: <AssistantRoute /> },
  { id: 'bookmarks', path: '/bookmarks', element: <BookmarksRoute /> },
  { id: 'cite', path: '/cite', element: <CiteRoute /> },
  { id: 'api-docs', path: '/api-docs', element: <ApiDocsRoute /> },
  { id: 'about', path: '/about', element: <AboutRoute /> },
  { id: 'contact', path: '/contact', element: <ContactRoute /> },
  { id: 'privacy', path: '/privacy', element: <PrivacyRoute /> },
  { id: 'not-found', path: '*', element: <NotFound /> },
];

/** Builds the RouteObject[] tree with explicit ids so loader data keys are stable. */
export function createAppRoutes(loaders: LoaderMap): RouteObject[] {
  return ROUTE_DEFINITIONS.map((definition) => ({
    id: definition.id,
    path: definition.path,
    element: <DocumentTitleSync>{definition.element}</DocumentTitleSync>,
    loader: loaders[definition.id],
    errorElement: <RouteErrorBoundary />,
  }));
}

/**
 * Browser-side loader: asks the server for this route's data via `/__data`
 * and interprets the envelope. Never fetches the route's own URL — the
 * supplied URL only tells the server which route matched.
 */
function clientDataLoader(routeId: RouteId): LoaderFunction {
  return async ({ request }: LoaderFunctionArgs) => {
    const url = new URL(request.url);
    const relative = url.pathname + url.search;
    const response = await fetch(
      `/__data?routeId=${routeId}&url=${encodeURIComponent(relative)}`,
      { method: 'GET', headers: { accept: 'application/json' }, credentials: 'same-origin' },
    );

    let envelope: RouteEnvelope;
    try {
      envelope = (await response.json()) as RouteEnvelope;
    } catch {
      throw new Response('The data service returned an unreadable response.', {
        status: 502,
        statusText: 'Bad Gateway',
      });
    }

    switch (envelope.kind) {
      case 'data':
        return envelope.data;
      case 'redirect':
        return redirect(envelope.location, envelope.status);
      case 'error':
        throw new Response(
          typeof envelope.data === 'string' ? envelope.data : JSON.stringify(envelope.data ?? null),
          { status: envelope.status, statusText: defaultStatusText(envelope.status) },
        );
      default:
        throw new Response('Unknown data envelope.', { status: 502, statusText: 'Bad Gateway' });
    }
  };
}

export function createBrowserRoutes(): RouteObject[] {
  const loaders: LoaderMap = {};
  for (const definition of ROUTE_DEFINITIONS) {
    loaders[definition.id] = clientDataLoader(definition.id);
  }
  return createAppRoutes(loaders);
}

/** Reason phrases for the statuses a loader can legitimately surface. */
export function defaultStatusText(status: number): string {
  switch (status) {
    case 400: return 'Bad Request';
    case 401: return 'Unauthorized';
    case 403: return 'Forbidden';
    case 404: return 'Not Found';
    case 405: return 'Method Not Allowed';
    case 409: return 'Conflict';
    case 422: return 'Unprocessable Entity';
    case 429: return 'Too Many Requests';
    case 500: return 'Internal Server Error';
    case 502: return 'Bad Gateway';
    case 503: return 'Service Unavailable';
    default: return 'Error';
  }
}
