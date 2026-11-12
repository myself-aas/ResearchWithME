'use client';

/**
 * DeferredImpactChart — code-splits Recharts out of the author route.
 *
 * Recharts and its d3 dependencies are the single largest client dependency in
 * the product. The impact radar is also the least urgent thing on an author
 * page: the name, identifiers, and article list all arrive first.
 *
 * Loading behaviour: the widget mounts when it is within 600px of the
 * viewport, then renders inside a fixed-height skeleton so the archive below
 * never shifts. `ssr: false` is deliberate — a chart with no JavaScript is an
 * empty SVG, and the surrounding Profile card already publishes the same
 * numbers as text (see AuthorProfileCard), so nothing is lost without it.
 */

import LazyMount from '@/components/motion/LazyMount';
import { SkeletonShard } from '@/components/motion/LoadingState';
import { lazyWidget } from '@/lib/motion/lazy';
import type { Author } from '@/lib/blog-data';
import { Card } from '@/components/primitives';

const Chart = lazyWidget(() => import('@/components/AuthorImpactRadarChart'), {
  label: 'Loading impact radar',
  minHeight: 340,
  hint: 'Charts load when this section approaches the viewport',
});

/** Mirrors `AuthorImpactRadarChartProps` without importing the chart module. */
export interface DeferredImpactChartProps {
  author: Author;
  articleCount: number;
  totalLikes: number;
  totalComments: number;
}

export default function DeferredImpactChart(props: DeferredImpactChartProps) {
  return (
    <LazyMount
      label="Loading impact radar"
      minHeight={340}
      fallback={
        <Card padding="xl" className="mt-6" aria-hidden="true">
          <SkeletonShard height={18} width="40%" />
          <div className="mt-6 flex items-center justify-center">
            <SkeletonShard height={240} width={240} rounded="rounded-full" />
          </div>
        </Card>
      }
    >
      <Chart {...props} />
    </LazyMount>
  );
}
