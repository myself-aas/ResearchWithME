import { renderToReadableStream } from 'react-dom/server.edge';
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
  type StaticHandlerContext,
} from 'react-router-dom/server';
import { HYDRATION_DATA_KEY } from './routes';
import type { RequestContext } from './server/context';
import { clientAssets } from './manifest';
import { pageMetadata, renderMetadataTags, type PageMetadataOverrides } from './server/metadata';
import { dirOf } from '@/lib/i18n/locales';
import LocaleProvider from '@/components/i18n/LocaleProvider';
import { getRequestLocale } from './server/locale';
import {
  createServerRoutes,
  serializeRouteError,
  toSerializableJson,
} from './server/route-data';

const encoder = new TextEncoder();

/**
 * Escapes the loader payload so it can be embedded inside an inline
 * <script> without any chance of breaking out (`</script>`, U+2028/2029).
 */
function safeJsonForHtml(value: unknown): string {
  return JSON.stringify(value ?? null)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

interface HydrationPayload {
  loaderData: unknown;
  actionData: unknown;
  errors: Record<string, unknown> | null;
}

/** Builds the exact state the browser router needs to resume without re-fetching. */
export function hydrationPayload(context: StaticHandlerContext): HydrationPayload {
  let errors: Record<string, unknown> | null = null;
  if (context.errors) {
    errors = {};
    for (const [routeId, error] of Object.entries(context.errors)) {
      // ErrorResponseImpl serializes cleanly; anything else collapses to a
      // generic 500 shape that still satisfies isRouteErrorResponse().
      errors[routeId] = serializeRouteError(error);
    }
  }
  return {
    loaderData: toSerializableJson(context.loaderData ?? {}),
    actionData: toSerializableJson(context.actionData ?? null),
    errors,
  };
}

interface LoaderMetadataEnvelope {
  metadata?: unknown;
}

/**
 * Finds the route metadata a loader embedded in its data, deepest match
 * first. Loaders treat these values as untrusted text — `pageMetadata`
 * collapses whitespace, caps length and the renderer attribute-escapes
 * everything — so this function only needs to recognise the shape.
 */
export function routeMetadataFromContext(context: StaticHandlerContext): PageMetadataOverrides {
  const loaderData = (context.loaderData ?? {}) as Record<string, unknown>;
  for (let index = (context.matches?.length ?? 0) - 1; index >= 0; index -= 1) {
    const match = context.matches[index];
    const routeId = match?.route?.id;
    if (!routeId) continue;
    const data = loaderData[routeId] as LoaderMetadataEnvelope | undefined;
    const metadata = data?.metadata;
    if (!metadata || typeof metadata !== 'object') continue;
    const candidate = metadata as Record<string, unknown>;
    const overrides: PageMetadataOverrides = {};
    if (typeof candidate.title === 'string' && candidate.title.trim()) overrides.title = candidate.title;
    if (typeof candidate.description === 'string' && candidate.description.trim()) {
      overrides.description = candidate.description;
    }
    if (candidate.type === 'article' || candidate.type === 'website') overrides.type = candidate.type;
    if (typeof candidate.path === 'string' && candidate.path.trim()) overrides.path = candidate.path;
    if (overrides.title || overrides.description || overrides.type || overrides.path) return overrides;
  }
  return {};
}

/**
 * Maps the static-handler context onto the HTTP status. Loader errors win
 * (the deepest matched status code is already in the context); otherwise the
 * catch-all not-found route is the only non-200 outcome in the table.
 */
function statusFromContext(context: StaticHandlerContext): number {
  if (context.errors) {
    return context.statusCode >= 400 && context.statusCode <= 599 ? context.statusCode : 500;
  }
  if (context.matches.some((match) => match.route?.id === 'not-found')) return 404;
  return context.statusCode >= 100 && context.statusCode <= 599 ? context.statusCode : 200;
}

export async function renderPage(ctx: RequestContext): Promise<Response> {
  const serverRoutes = createServerRoutes(ctx);
  const staticHandler = createStaticHandler(serverRoutes);

  let queryContext: StaticHandlerContext | Response;
  try {
    queryContext = await staticHandler.query(ctx.request);
  } catch (error) {
    console.error('Refusing to render after a routing failure:', error);
    return new Response('Internal Server Error', {
      status: 500,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  if (queryContext instanceof Response) {
    // A loader short-circuited with a redirect: pass it through, never cacheable.
    const headers = new Headers(queryContext.headers);
    if (!headers.has('cache-control')) headers.set('cache-control', 'private, no-store');
    return new Response(queryContext.body, {
      status: queryContext.status,
      statusText: queryContext.statusText,
      headers,
    });
  }

  const status = statusFromContext(queryContext);
  const router = createStaticRouter(serverRoutes, queryContext);
  const assets = clientAssets();
  const metadataTags = renderMetadataTags(pageMetadata(ctx, routeMetadataFromContext(queryContext)));
  const hydrationJson = safeJsonForHtml(hydrationPayload(queryContext));
  const locale = getRequestLocale(ctx);
  const dir = dirOf(locale);
  const cssLinks = (assets.css ?? [])
    .map((file) => `<link rel="stylesheet" href="/${file}">`)
    .join('');

  const appStream = await renderToReadableStream(
    <LocaleProvider initialLocale={locale}>
      <StaticRouterProvider router={router} context={queryContext} />
    </LocaleProvider>,
    { bootstrapModules: [`/${assets.file}`] },
  );
  await appStream.allReady;

  // locale/dir are derived from resolveLocale(), never from raw request text,
  // so they are safe to interpolate into the shell.
  const head =
    `<!doctype html><html lang="${locale}" dir="${dir}"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<meta name="color-scheme" content="light">` +
    `<meta name="theme-color" content="#F8F7F3">` +
    metadataTags +
    cssLinks +
    `<link rel="preload" as="font" type="font/woff2" href="/fonts/newsreader-latin-variable.woff2" crossorigin>` +
    `<link rel="preload" as="font" type="font/woff2" href="/fonts/inter-latin-variable.woff2" crossorigin>` +
    `<script>window.__RWM_LOCALE__=${JSON.stringify(locale)};window.${HYDRATION_DATA_KEY}=${hydrationJson}</script>` +
    `</head><body class="bg-stone-50 font-serif text-stone-900 antialiased">` +
    `<a href="#main-content" class="sr-only left-4 top-4 z-[100] rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm focus:not-sr-only focus:fixed">Skip to main content</a>` +
    `<div id="root">`;
  const tail = '</div></body></html>';

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(head));
      const reader = appStream.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
      } finally {
        reader.releaseLock();
      }
      controller.enqueue(encoder.encode(tail));
      controller.close();
    },
  });

  return new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
