'use client';

import { useEffect } from 'react';

/**
 * ResearchWithME v3.4 Part V §15.1–§15.2 — PWA Service Worker & Foreground Sync Bridge.
 *
 * Registers `/sw.js` in browser contexts and dispatches a custom
 * `rwm:sync-trigger` event whenever the network comes back online or the tab
 * returns to foreground, ensuring offline draft queues flush reliably even on
 * browsers without the Background Sync API.
 */
export default function PwaLifecycleBridge() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        // Non-fatal in private browsing or restricted iframes
      });
    }

    const triggerSync = (reason: 'online' | 'foreground') => {
      window.dispatchEvent(new CustomEvent('rwm:sync-trigger', { detail: { reason } }));
    };

    const handleOnline = () => triggerSync('online');
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        triggerSync('foreground');
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return null;
}
