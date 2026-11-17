'use client';

import { useEffect } from 'react';

export const EDITOR_BACKGROUND_SYNC_TAG = 'rwm-editor-autosave-sync';

interface SyncManagerLike {
  register(tag: string): Promise<void>;
}

/**
 * Requests a Service Worker Background Sync registration for queued offline
 * editor mutations (fails gracefully on browsers without Background Sync).
 */
export async function registerEditorBackgroundSync(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false;
  try {
    const registration = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration & {
      sync?: SyncManagerLike;
    };
    if (registration.sync && typeof registration.sync.register === 'function') {
      await registration.sync.register(EDITOR_BACKGROUND_SYNC_TAG);
      return true;
    }
  } catch {
    // Non-fatal in private browsing or browsers without Background Sync API
  }
  return false;
}

/**
 * ResearchWithME v3.4 Part V §15.1–§15.2 — PWA Service Worker, Background Sync
 * & Foreground Sync Bridge (Wave 18 P1).
 *
 * Registers `/sw.js`, relays `RWM_BG_SYNC_FLUSH` messages from the Service Worker
 * Background Sync event into `rwm:sync-trigger`, and falls back cleanly to
 * `online` + `visibilitychange` triggers for Safari/Firefox compatibility.
 */
export default function PwaLifecycleBridge() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        // Non-fatal in private browsing or restricted iframes
      });
    }

    const triggerSync = (reason: 'online' | 'foreground' | 'background-sync') => {
      window.dispatchEvent(new CustomEvent('rwm:sync-trigger', { detail: { reason } }));
    };

    const handleOnline = () => triggerSync('online');
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        triggerSync('foreground');
      }
    };
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'RWM_BG_SYNC_FLUSH') {
        triggerSync('background-sync');
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
    };
  }, []);

  return null;
}
