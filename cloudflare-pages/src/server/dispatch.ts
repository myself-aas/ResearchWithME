import {
  createRequestContext,
  PublicConfigError,
  type AppEnv,
  type RequestContext,
  type RuntimeMode,
  type RuntimeServices,
} from './context';
import { applyHeaders, applySecurityHeaders } from './headers';
import { renderPage } from '../document';
import { handleAuthCallback } from './auth';
import { handleRouteData, ROUTE_DATA_PATH } from './route-data';
import { dispatchApi } from './api/registry';

/**
 * Creates a fresh request context, renders the response and finalises it:
 * security policy, cookie flush and cache rules are applied on every path,
 * including errors and redirects. A misconfigured effective-production
 * deployment fails closed with a 503 that never touches the demo data.
 */
export async function handleRequest(
  request: Request,
  env: AppEnv,
  runtime: RuntimeMode,
  services?: Partial<RuntimeServices>,
): Promise<Response> {
  let ctx: RequestContext;
  try {
    ctx = createRequestContext(request, env, runtime, services);
  } catch (error) {
    if (error instanceof PublicConfigError) {
      console.error('Refusing to serve a misconfigured production deployment:', error.message);
      return applySecurityHeaders(
        new Response('The service is not configured correctly.', {
          status: 503,
          headers: { 'cache-control': 'no-store', 'content-type': 'text/plain; charset=utf-8' },
        }),
      );
    }
    console.error('Could not create the request context:', error);
    return applySecurityHeaders(
      new Response('Internal Server Error', {
        status: 500,
        headers: { 'cache-control': 'no-store', 'content-type': 'text/plain; charset=utf-8' },
      }),
    );
  }

  try {
    // /api/* (Tasks 7–9) and the auth callback (Task 6) are real routes;
    // /__data is the secure loader transport (Task 10); everything else
    // renders the shared route table through the SSR shell.
    const pathname = new URL(ctx.request.url).pathname;
    const response =
      (await dispatchApi(ctx)) ??
      (pathname === ROUTE_DATA_PATH
        ? await handleRouteData(ctx)
        : pathname === '/auth/callback'
          ? await handleAuthCallback(ctx)
          : await renderPage(ctx));
    return applyHeaders(ctx.cookies.apply(response), ctx);
  } catch (error) {
    console.error('Unhandled error while handling the request:', error);
    return applyHeaders(
      ctx.cookies.apply(
        new Response('Internal Server Error', {
          status: 500,
          headers: { 'content-type': 'text/plain; charset=utf-8' },
        }),
      ),
      ctx,
    );
  }
}
