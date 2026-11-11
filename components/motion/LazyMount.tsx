'use client';

/**
 * LazyMount — viewport-gated mounting for expensive client widgets.
 *
 * Policy (πeme §18 code-splitting + animation-principles staging):
 *  - Anything a crawler must read stays server-rendered. LazyMount is for
 *    widgets that are *interactive only*: graphs, charts, editors, players.
 *  - The placeholder occupies the widget's final box (skeleton matches the
 *    content it replaces), so mounting never shifts the layout.
 *  - Hydration is deterministic: server and first client render both show the
 *    placeholder; the observer decides afterwards, so there is never a
 *    mismatch and never a "content then skeleton" flash.
 *  - `rootMargin` starts the import about one viewport early, so a reader who
 *    scrolls at speed still meets rendered content.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SkeletonShard } from './LoadingState';

export interface LazyMountProps {
  children?: ReactNode;
  /** Placeholder shown before the widget is mounted. */
  fallback?: ReactNode;
  /** Accessible name announced while the placeholder is visible. */
  label: string;
  /** Distance ahead of the viewport to begin mounting. Default 600px. */
  rootMargin?: string;
  /** Keep the widget mounted once shown. Default true. */
  once?: boolean;
  /** Reserve the widget's height to prevent layout shift. */
  minHeight?: number | string;
  className?: string;
  /** Render even when IntersectionObserver is unavailable (default true). */
  eagerFallback?: boolean;
}

export default function LazyMount({
  children,
  fallback,
  label,
  rootMargin = '600px 0px',
  once = true,
  minHeight,
  className = '',
  eagerFallback = true,
}: LazyMountProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      if (eagerFallback) setMounted(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setMounted(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setMounted(false);
          }
        }
      },
      { rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once, rootMargin, eagerFallback]);

  return (
    <div
      ref={ref}
      className={className}
      style={minHeight !== undefined ? { minHeight } : undefined}
      aria-busy={!mounted}
      data-lazy-state={mounted ? 'mounted' : 'deferred'}
    >
      {mounted ? (
        children
      ) : (
        <div role="status" aria-live="polite">
          <span className="sr-only">{label}</span>
          {fallback ?? <SkeletonShard height={minHeight ?? 200} lines={1} rounded="rounded-sm" />}
        </div>
      )}
    </div>
  );
}
