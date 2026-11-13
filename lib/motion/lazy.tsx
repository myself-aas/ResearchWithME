'use client';

/**
 * Code-splitting helpers for the motion system.
 *
 * Two entry points:
 *
 * - `lazyWidget()` wraps `next/dynamic` with a reme-shaped skeleton and a
 *   human label, so every lazy boundary looks and announces the same thing.
 *   `ssr: false` is the default for widgets that only exist to be touched
 *   (graph canvases, chart libraries, editors, players); pass `ssr: true` for
 *   anything whose text a crawler should read.
 *
 * - `deferToIdle()` schedules non-urgent work (warm imports, analytics-free
 *   precomputation) for `requestIdleCallback`, with a timeout fallback for
 *   Safari.
 *
 * The returned component is safe in both the Next app and the Cloudflare Pages
 * target: both resolve `next/dynamic` (the Pages build aliases it to a
 * React.lazy-based shim).
 */

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

export interface LazyWidgetOptions {
  /** Accessible + visible label for the loading placeholder. */
  label: string;
  /** Reserved height so the swap never shifts layout. Default 220px. */
  minHeight?: number;
  /** Server-render the widget (only when it is crawlable). Default false. */
  ssr?: boolean;
  /** Context line shown under the placeholder, e.g. why it is lazily loaded. */
  hint?: string;
}

function Placeholder({ label, minHeight, hint }: { label: string; minHeight: number; hint?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex w-full flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-line bg-surface text-ink-secondary"
      style={{ minHeight }}
    >
      <span className="h-1.5 w-24 animate-pulse rounded-full bg-surface-subtle" aria-hidden="true" />
      <span className="font-sans text-xs">{label}</span>
      {hint ? <span className="font-mono text-xs uppercase tracking-wider">{hint}</span> : null}
    </div>
  );
}

/**
 * Wrap a client-only widget in a labelled lazy boundary.
 *
 * ```tsx
 * const ProvenanceGraph = lazyWidget(() => import('@/components/graph/ProvenanceGraph'), {
 *   label: 'Loading provenance graph',
 *   minHeight: 360,
 * });
 * ```
 */
export function lazyWidget<P extends object>(
  loader: () => Promise<{ default: ComponentType<P> }>,
  options: LazyWidgetOptions,
): ComponentType<P> {
  const { label, minHeight = 220, ssr = false, hint } = options;

  function LazyPlaceholder() {
    return <Placeholder label={label} minHeight={minHeight} hint={hint} />;
  }
  LazyPlaceholder.displayName = 'LazyWidgetPlaceholder';

  const Widget = dynamic(loader, { ssr, loading: LazyPlaceholder });
  Widget.displayName = `LazyWidget(${label})`;
  return Widget as ComponentType<P>;
}

type IdleHandle = { cancel: () => void };

/**
 * Run `task` when the main thread is idle. Returns a cancel handle.
 * Falls back to a 200ms timeout where `requestIdleCallback` is missing.
 */
export function deferToIdle(task: () => void, timeout = 1200): IdleHandle {
  if (typeof window === 'undefined') return { cancel: () => {} };

  const idle = (
    window as unknown as {
      requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    }
  ).requestIdleCallback;

  if (typeof idle === 'function') {
    const handle = idle(() => task(), { timeout });
    return {
      cancel: () => (window as unknown as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback?.(handle),
    };
  }

  const timer = window.setTimeout(task, 200);
  return { cancel: () => window.clearTimeout(timer) };
}
