/**
 * ResearchWithME v3.4 Part V §15.1–§15.2 — Classification-Safe PWA Service Worker
 * with Background Sync & VAPID Push Handling (Wave 18 P1).
 *
 * Cache policy:
 * - Static app shell (`/_next/static/*`, icons, fonts): cache-first (versioned)
 * - Public scholarly pages (`/feed`, `/sources`, `/evidence`, `/claims`, `/tools`,
 *   `/topics`, `/contribution/*`, `/source/*`): stale-while-revalidate
 * - Authenticated APIs, dashboards, Research OS, exports, `/api/me*`, `/api/sync*`:
 *   STRICT NETWORK-ONLY (never cached in Service Worker to protect restricted research content).
 *
 * Background Sync (`rwm-editor-autosave-sync`):
 * - Notifies open editor windows (`RWM_BG_SYNC_FLUSH`) AND drains pending mutations
 *   stored in IndexedDB (`researchwithme-editor`, store `mutations`) when no tab is open.
 */

const SHELL_CACHE = 'rwm-v34-shell-v2';
const PUBLIC_PAGE_CACHE = 'rwm-v34-public-v2';
const EDITOR_BG_SYNC_TAG = 'rwm-editor-autosave-sync';
const EDITOR_IDB_NAME = 'researchwithme-editor';
const EDITOR_IDB_VERSION = 2;
const EDITOR_MUTATIONS_STORE = 'mutations';

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

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'RWM_LOGOUT_WIPE') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))),
    );
  }
});

function openEditorDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(EDITOR_IDB_NAME, EDITOR_IDB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('drafts')) {
        db.createObjectStore('drafts', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(EDITOR_MUTATIONS_STORE)) {
        const store = db.createObjectStore(EDITOR_MUTATIONS_STORE, { keyPath: 'mutationId' });
        store.createIndex('byDraft', 'draftId', { unique: false });
      }
      if (!db.objectStoreNames.contains('snapshots')) {
        const snap = db.createObjectStore('snapshots', { keyPath: 'id' });
        snap.createIndex('byDraft', 'draftId', { unique: false });
      }
    };
  });
}

async function flushQueuedEditorMutationsInBackground() {
  // 1. If any controlled window is open, trigger its DraftSyncCoordinator directly
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: false });
  if (clients.length > 0) {
    for (const client of clients) {
      client.postMessage({ type: 'RWM_BG_SYNC_FLUSH', tag: EDITOR_BG_SYNC_TAG });
    }
    return;
  }

  // 2. Otherwise replay queued mutations directly from IndexedDB
  if (typeof indexedDB === 'undefined') return;
  let db;
  try {
    db = await openEditorDb();
  } catch {
    return;
  }

  const mutations = await new Promise((resolve) => {
    const tx = db.transaction(EDITOR_MUTATIONS_STORE, 'readonly');
    const req = tx.objectStore(EDITOR_MUTATIONS_STORE).getAll();
    req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
    req.onerror = () => resolve([]);
  });

  for (const mutation of mutations) {
    if (!mutation || !mutation.draftId || !mutation.mutationId) continue;
    const res = await fetch(`/api/drafts/${encodeURIComponent(mutation.draftId)}/autosave`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mutationId: mutation.mutationId,
        baseVersion: mutation.baseVersion,
        contributionType: mutation.contributionType,
        title: mutation.title,
        document: mutation.payload,
        reason: 'interval',
      }),
    });

    if (res.ok) {
      await new Promise((resolve) => {
        const tx = db.transaction(EDITOR_MUTATIONS_STORE, 'readwrite');
        tx.objectStore(EDITOR_MUTATIONS_STORE).delete(mutation.mutationId);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } else if (res.status >= 500 || res.status === 429) {
      // Throw so the browser reschedules the Background Sync tag with backoff
      throw new Error(`Background autosave retryable HTTP ${res.status}`);
    }
  }
}

self.addEventListener('sync', (event) => {
  if (event.tag === EDITOR_BG_SYNC_TAG) {
    event.waitUntil(flushQueuedEditorMutationsInBackground());
  }
});

// Classification-safe VAPID Web Push display (never relies on unencrypted prose)
self.addEventListener('push', (event) => {
  const title = 'ResearchWithME';
  const body = 'You have a research attention or review update waiting in your workspace.';
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: 'rwm-research-update',
      data: { href: '/dashboard' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetHref = (event.notification.data && event.notification.data.href) || '/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(targetHref).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(targetHref);
    }),
  );
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
