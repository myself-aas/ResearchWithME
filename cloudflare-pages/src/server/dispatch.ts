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
import { authMdResponse } from '@/lib/auth-md';
import { protectedResourceMetadata } from '@/lib/agent-auth';
import { oauthDiscoveryResponse } from '@/lib/oauth-discovery';
import { agentCard } from '@/lib/a2a';
import { INDEX_PATH, SKILL_PATH, skillsIndexResponse, skillArtifactResponse } from '@/lib/agent-skills';
import { mcpCardResponse, handleMcp } from '@/lib/mcp';
import { WEB_BOT_DIRECTORY, webBotDirectoryResponse } from '@/lib/web-bot-auth';
import { getPublicArticleCatalogue } from './stores';
import { rateLimit } from './context';
import { clientKey } from './http';
import { markdownRoute, wantsMarkdown, renderMarkdown, markdownResponse } from '@/lib/markdown-negotiation';

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
    const markdown = markdownRoute(pathname);
    if (markdown && (ctx.request.method === 'GET' || ctx.request.method === 'HEAD') &&
        wantsMarkdown(ctx.request.headers.get('accept'))) {
      const posts = await getPublicArticleCatalogue(ctx);
      const body = renderMarkdown(pathname, new URL(ctx.request.url).searchParams.get('search') ?? '', posts, ctx.config.siteUrl);
      return applyHeaders(ctx.cookies.apply(markdownResponse(body, ctx.request.method)), ctx);
    }
    const response =
      (pathname === '/auth.md' ? authMdResponse(ctx.request.method) : null) ??
      (pathname === WEB_BOT_DIRECTORY
        ? await webBotDirectoryResponse(
            ctx.env.WEB_BOT_AUTH_PRIVATE_JWK,
            ctx.request.method,
            new URL(ctx.request.url).host,
          ) : null) ??
      (pathname === '/.well-known/mcp/server-card.json'
        ? mcpCardResponse(ctx.config.siteUrl, ctx.request.method) : null) ??
      (pathname === '/mcp' ? await (async () => {
        if (ctx.request.method === 'POST') {
          const limit = await rateLimit(ctx, clientKey(ctx.request, 'mcp'), 30, 60_000);
          if (!limit.allowed) return new Response(JSON.stringify({ error: 'Too many requests.' }), {
            status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil(limit.retryAfter / 1000)), 'Cache-Control': 'no-store' },
          });
        }
        return handleMcp(ctx.request, () => getPublicArticleCatalogue(ctx), ctx.config.siteUrl);
      })() : null) ??
      (pathname === INDEX_PATH ? await skillsIndexResponse(ctx.request.method) : null) ??
      (pathname === SKILL_PATH ? skillArtifactResponse(ctx.request.method) : null) ??
      (pathname === '/.well-known/agent-card.json' && (ctx.request.method === 'GET' || ctx.request.method === 'HEAD')
        ? new Response(ctx.request.method === 'HEAD' ? null : JSON.stringify(agentCard(ctx.config.siteUrl)), {
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
          }) : null) ??
      (pathname === '/.well-known/oauth-protected-resource'
        ? protectedResourceMetadata(ctx.config.siteUrl) : null) ??
      (pathname === '/.well-known/oauth-authorization-server' || pathname === '/.well-known/openid-configuration'
        ? await oauthDiscoveryResponse(ctx.config.supabaseUrl, ctx.request.method, ctx.config.siteUrl) : null) ??
      (await dispatchApi(ctx)) ??
      (pathname === ROUTE_DATA_PATH
        ? await handleRouteData(ctx)
        : pathname === '/auth/callback'
          ? await handleAuthCallback(ctx)
          : await renderPage(ctx));
    if (markdown) response.headers.append('Vary', 'Accept');
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
