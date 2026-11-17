/**
 * ResearchWithME v3.4 Part V §15.1 — Classification-Safe PWA Service Worker.
 *
 * Cache policy:
 * - Static app shell (`/_next/static/*`, icons, fonts): cache-first (versioned)
 * - Public scholarly pages (`/feed`, `/sources`, `/evidence`, `/claims`, `/tools`, `/topics`, `/contribution/*`, `/source/*`): stale-while-revalidate
 * - Authenticated APIs, dashboards, Research OS, exports, `/api/me*`, `/api/sync*`:
 *   STRICT NETWORK-ONLY (never cached in Service Worker to protect restricted research content).
 */

const SHELL_CACHE = 'rwm-v34-shell-v1';
const PUBLIC_PAGE_CACHE = 'rwm-v34-public-v1';

const NEVER_CACHE_PREFIXES = [
  '/api/',
  '/dashboard',
  '/research-os',
  '/settings',
  '/contribute',
  '/workspaces',
  '/projects',
  '/project/',
  '/auth/',
  '/login',
];

const PUBLIC_SWR_PREFIXES = [
  '/feed',
  '/sources',
  '/source/',
  '/evidence',
  '/claims',
  '/claim/',
  '/tools',
  '/tool/',
  '/topics',
  '/contribution/',
  '/articles',
  '/post/',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(SHELL_CACHE));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== PUBLIC_PAGE_CACHE)
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const path = url.pathname;

  // Never cache authenticated, restricted, export, or private routes
  if (NEVER_CACHE_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return;
  }

  // Versioned immutable static shell assets: cache-first
  if (path.startsWith('/_next/static/') || path.startsWith('/icons/')) {
    event.respondWith(
      caches.open(SHELL_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      }),
    );
    return;
  }

  // Public scholarly reading pages: stale-while-revalidate
  if (PUBLIC_SWR_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    event.respondWith(
      caches.open(PUBLIC_PAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const networkPromise = fetch(request)
          .then((response) => {
            if (response.ok && !response.headers.get('cache-control')?.includes('private')) {
              cache.put(request, response.clone()).catch(() => {});
            }
            return response;
          })
          .catch(() => cached);
        return cached || networkPromise;
      }),
    );
  }
});
