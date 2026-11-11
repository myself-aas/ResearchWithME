/**
 * Contract tests for the Pages SSR shell (Task 10). The in-process harness
 * runs the real dispatcher; no network, no fixtures selectable from HTTP.
 */
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router-dom/server';
import { createTestApp } from '@/test/support/pages';
import { createAppRoutes } from '@/cloudflare-pages/src/routes';
import { HYDRATION_DATA_KEY } from '@/cloudflare-pages/src/routes';

describe('renderPage (via handleRequest)', () => {
  it('returns real 404s for unknown paths', async () => {
    const app = createTestApp();
    const res = await app.request('/no-such-page');

    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(await res.text()).toContain('404');
  });

  it('renders the root document with hydration data and the client entry', async () => {
    const app = createTestApp();
    const res = await app.request('/');

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html; charset=utf-8');
    const html = await res.text();
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('id="root"');
    // Hydration data is embedded so the browser router resumes with the
    // same loader state instead of re-fetching on first paint.
    expect(html).toContain(`window.${HYDRATION_DATA_KEY}=`);
    // The client entry is emitted from the Vite manifest fixture, never
    // guessed: test/support/pages.ts stubs the manifest with a known file.
    expect(html).toMatch(/assets\/entry-client-[A-Za-z0-9_-]+\.js/);
    // The ported reader home renders its real SSR markup: the platform hero.
    expect(html).toContain('Research you can read, check, and reuse.');
    // The <title> carries the site name even for the default document.
    expect(html).toContain('ResearchWithMe');
  });

  it('escapes the hydration payload so embedded JSON cannot break out of <script>', async () => {
    const app = createTestApp();
    const res = await app.request('/');
    const html = await res.text();

    const marker = `window.${HYDRATION_DATA_KEY}=`;
    const start = html.indexOf(marker);
    expect(start).toBeGreaterThan(-1);
    const scriptEnd = html.indexOf('</script>', start);
    expect(scriptEnd).toBeGreaterThan(-1);
    const payload = html.slice(start + marker.length, scriptEnd);
    expect(payload).not.toContain('<');
    expect(payload).not.toContain('\u2028');
    expect(payload).not.toContain('\u2029');
    expect(() => JSON.parse(payload)).not.toThrow();
  });

  it('derives the not-found status from the matched route, not just loader errors', async () => {
    const app = createTestApp();
    // The not-found route carries no loader; status must still be 404.
    const res = await app.request('/definitely/not/a/page');
    expect(res.status).toBe(404);
  });

  it('renders the route error boundary when a loader throws a Response', async () => {
    const serverRoutes = createAppRoutes({
      home: () => {
        throw new Response('gone', { status: 404, statusText: 'Not Found' });
      },
    });
    const staticHandler = createStaticHandler(serverRoutes);
    const context = await staticHandler.query(new Request('http://boundary.invalid/'));
    expect(context).not.toBeInstanceOf(Response);
    if (context instanceof Response) return; // narrowed for TS
    expect(context.statusCode).toBe(404);

    const router = createStaticRouter(serverRoutes, context);
    const html = renderToStaticMarkup(
      createElement(StaticRouterProvider, { router, context }),
    );
    expect(html).toContain('Page not found');
    expect(html).toContain('/');
  });
});
