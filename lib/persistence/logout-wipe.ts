/**
 * ResearchWithME v3.4 Part V §15.3 — Logout & Device Revocation Local Wipe.
 *
 * On explicit logout or device revocation:
 * 1. Clears local IndexedDB restricted drafts and pending mutation queues
 *    when `clearLocalDrafts` is true (default true for security).
 * 2. Purges non-static Service Worker caches so no private summaries remain.
 * 3. Unregisters any active browser Web Push subscription if requested.
 */

import { editorDb } from './editor-db';

export interface LogoutWipeOptions {
  clearLocalDrafts?: boolean;
  unregisterPush?: boolean;
  clearServiceWorkerCaches?: boolean;
}

export interface LogoutWipeResult {
  draftsCleared: boolean;
  cachesCleared: number;
  pushUnsubscribed: boolean;
}

export async function performLogoutLocalWipe(
  options: LogoutWipeOptions = {},
): Promise<LogoutWipeResult> {
  const clearLocalDrafts = options.clearLocalDrafts ?? true;
  const unregisterPush = options.unregisterPush ?? true;
  const clearServiceWorkerCaches = options.clearServiceWorkerCaches ?? true;

  let draftsCleared = false;
  let cachesCleared = 0;
  let pushUnsubscribed = false;

  if (clearLocalDrafts) {
    try {
      await editorDb.clearAll();
      draftsCleared = true;
    } catch {
      draftsCleared = false;
    }
  }

  if (clearServiceWorkerCaches && typeof caches !== 'undefined') {
    try {
      const keys = await caches.keys();
      for (const key of keys) {
        // Keep immutable versioned static asset shell if needed; wipe all runtime/API/page caches
        if (!key.startsWith('rwm-v34-shell-')) {
          const deleted = await caches.delete(key);
          if (deleted) cachesCleared += 1;
        }
      }
    } catch {
      // Ignore cache API errors in restricted environments
    }
  }

  if (
    unregisterPush &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator
  ) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager?.getSubscription();
      if (sub) {
        pushUnsubscribed = await sub.unsubscribe();
      }
    } catch {
      pushUnsubscribed = false;
    }
  }

  return { draftsCleared, cachesCleared, pushUnsubscribed };
}
