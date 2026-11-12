/**
 * RouteSkeleton — server-rendered silhouette for a route segment's `loading.tsx`.
 *
 * Purpose: hold the page's shape while a dynamic route streams in, so the
 * layout does not collapse and the reader does not see a spinner on white.
 *
 * Motion contract: this is deliberately **CSS only**. A `loading.tsx` renders
 * outside any client boundary the app controls, and a deferred route can
 * appear before the motion scope hydrates; a CSS pulse that the global
 * `prefers-reduced-motion` rule neutralises is the honest primitive here. The
 * JS-driven `SkeletonShard` (components/motion/LoadingState) is for surfaces
 * that are already hydrated.
 *
 * Screen reader: each block is `aria-hidden`; the wrapper carries
 * `role="status"` + `aria-busy="true"` and one `sr-only` label.
 * Token mapping: `bg-surface-subtle` shards on `bg-canvas`.
 */

import Skeleton from '@/components/ui/Skeleton';
import { Card } from '@/components/primitives';

export type RouteSkeletonVariant = 'article' | 'archive' | 'profile';

export interface RouteSkeletonProps {
  variant?: RouteSkeletonVariant;
  /** What is loading, announced by the live region. */
  label?: string;
}

function Sidebar() {
  return (
    <aside aria-hidden="true" className="hidden w-56 shrink-0 lg:block">
      <div className="sticky top-24 space-y-3">
        <div className="h-3 w-24 animate-pulse rounded-sm bg-surface-subtle" />
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-3 w-full animate-pulse rounded-sm bg-surface-subtle" />
        ))}
      </div>
    </aside>
  );
}

export default function RouteSkeleton({ variant = 'article', label = 'Loading page' }: RouteSkeletonProps) {
  if (variant === 'archive') {
    return (
      <div role="status" aria-busy="true" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <span className="sr-only">{label}</span>
        <div aria-hidden="true">
          <div className="h-3 w-32 animate-pulse rounded-sm bg-surface-subtle" />
          <div className="mt-4 h-9 w-2/3 animate-pulse rounded-sm bg-surface-subtle" />
          <div className="mt-3 h-4 w-1/2 animate-pulse rounded-sm bg-surface-subtle" />
          <div className="mt-8 flex flex-wrap gap-2">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="h-8 w-24 animate-pulse rounded-sm bg-surface-subtle" />
            ))}
          </div>
          <ul data-layout-grid="route-skeleton-cards" className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Card key={index} as="li" padding="lg">
                <div className="h-3 w-20 animate-pulse rounded-sm bg-surface-subtle" />
                <div className="mt-3 h-5 w-4/5 animate-pulse rounded-sm bg-surface-subtle" />
                <div className="mt-3 space-y-2">
                  <div className="h-3 w-full animate-pulse rounded-sm bg-surface-subtle" />
                  <div className="h-3 w-2/3 animate-pulse rounded-sm bg-surface-subtle" />
                </div>
              </Card>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (variant === 'profile') {
    return (
      <div role="status" aria-busy="true" className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <span className="sr-only">{label}</span>
        <div aria-hidden="true" className="flex items-start gap-5">
          <div className="h-16 w-16 shrink-0 animate-pulse rounded-sm bg-surface-subtle" />
          <div className="min-w-0 flex-1">
            <div className="h-8 w-2/3 animate-pulse rounded-sm bg-surface-subtle" />
            <div className="mt-3 h-3 w-1/3 animate-pulse rounded-sm bg-surface-subtle" />
            <div className="mt-4 space-y-2">
              <div className="h-3 w-full animate-pulse rounded-sm bg-surface-subtle" />
              <div className="h-3 w-5/6 animate-pulse rounded-sm bg-surface-subtle" />
            </div>
          </div>
        </div>
        <div className="mt-10 space-y-4 border-t border-line pt-8">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-4 w-full animate-pulse rounded-sm bg-surface-subtle" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div role="status" aria-busy="true" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="flex gap-12">
        <div className="reading-column min-w-0 flex-1">
          <div className="h-3 w-24 animate-pulse rounded-sm bg-surface-subtle" />
          <div className="mt-4 h-10 w-full animate-pulse rounded-sm bg-surface-subtle" />
          <div className="mt-2 h-10 w-3/4 animate-pulse rounded-sm bg-surface-subtle" />
          <div className="mt-6 flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-sm bg-surface-subtle" />
            <div className="h-3 w-40 animate-pulse rounded-sm bg-surface-subtle" />
          </div>
          <div className="mt-10 space-y-3">
            <Skeleton lines={4} />
          </div>
          <div className="mt-8 space-y-3">
            <Skeleton lines={6} />
          </div>
        </div>
        <Sidebar />
      </div>
    </div>
  );
}
