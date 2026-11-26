'use client';

import { useRef, useState } from 'react';
import FigureChrome, { READOUT_CLASS } from './FigureChrome';
import { bucketValue, moveDivider, type BudgetBucket, type BudgetTotals } from '@/lib/figures/budget';

/**
 * BudgetSplit — archetype `partition-drag-allocation`.
 *
 * A fixed budget is partitioned across buckets by dragging the dividers
 * between segments of one bar: dragging a divider takes from the right
 * neighbour and gives to the left. Where the trade-off pad drags a point
 * through a 2-D plane and the assumption switches flip booleans, this figure
 * manipulates a *partition* — the whole is fixed, only the split moves.
 * Buckets may carry real caps (§9 budgets), and an over-cap request is
 * clamped and said so.
 */
export default function BudgetSplit({
  title,
  subtitle,
  buckets,
  totals,
  initialShares,
}: {
  title: string;
  subtitle: string;
  buckets: BudgetBucket[];
  totals: BudgetTotals;
  initialShares?: number[];
}) {
  const [shares, setShares] = useState<number[]>(() => {
    const provided = initialShares ?? buckets.map(() => 100 / Math.max(buckets.length, 1));
    return provided.slice(0, buckets.length);
  });
  const bar = useRef<HTMLDivElement>(null);

  function dragDivider(index: number, clientX: number) {
    const rect = bar.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const before = shares.slice(0, index).reduce((sum, share) => sum + share, 0);
    setShares((current) => moveDivider(current, index, x - before - current[index], buckets));
  }

  const overCap = buckets
    .map((bucket, index) => ({ bucket, value: bucketValue(bucket, shares[index], totals) }))
    .filter(({ bucket, value }) => bucket.max && bucket.max > 0 && value >= bucket.max)
    .map(({ bucket }) => bucket.label);

  return (
    <FigureChrome title={title} subtitle={subtitle}>
      <div ref={bar} className="relative flex h-12 overflow-hidden rounded-xl border border-line">
        {buckets.map((bucket, index) => (
          <div
            key={bucket.id}
            className={`relative h-full border-r border-line last:border-r-0 ${
              ['bg-brand/80', 'bg-trust-emerging/70', 'bg-knowledge-insight/60', 'bg-ink/60'][index % 4]
            }`}
            style={{ width: `${shares[index]}%` }}
            aria-hidden="true"
          >
            <span className="absolute inset-0 flex items-center justify-center px-1 text-center font-mono text-[0.6875rem] font-semibold text-on-primary">
              {Math.round(shares[index])}%
            </span>
          </div>
        ))}
        {buckets.slice(0, -1).map((_bucket, index) => (
          <button
            key={index}
            type="button"
            role="slider"
            aria-label={`Divider between ${buckets[index].label} and ${buckets[index + 1].label}`}
            aria-valuenow={Math.round(shares[index])}
            aria-valuemin={0}
            aria-valuemax={100}
            tabIndex={0}
            onKeyDown={(event) => {
              const step = event.shiftKey ? 10 : 2;
              if (event.key === 'ArrowLeft') setShares((current) => moveDivider(current, index, -step, buckets));
              else if (event.key === 'ArrowRight') setShares((current) => moveDivider(current, index, step, buckets));
              else return;
              event.preventDefault();
            }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              dragDivider(index, event.clientX);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) dragDivider(index, event.clientX);
            }}
            className="absolute inset-y-0 z-10 w-6 -translate-x-1/2 cursor-col-resize focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus [touch-action:none]"
            style={{ left: `${shares.slice(0, index + 1).reduce((sum, share) => sum + share, 0)}%` }}
          >
            <span
              aria-hidden="true"
              className="mx-auto h-full w-1 rounded-full bg-canvas shadow-sm transition-colors hover:bg-brand"
            />
          </button>
        ))}
      </div>

      <dl className="mt-4 grid gap-2 sm:grid-cols-2">
        {buckets.map((bucket, index) => {
          const value = bucketValue(bucket, shares[index], totals);
          return (
            <div key={bucket.id} className="flex items-baseline justify-between gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5">
              <dt className="font-sans text-xs font-medium text-ink-secondary">{bucket.label}</dt>
              <dd className="font-mono text-xs text-ink">
                {Math.round(value)} {totals.unit}
                {bucket.max && bucket.max > 0 ? ` / cap ${bucket.max}` : ''}
              </dd>
            </div>
          );
        })}
      </dl>

      <p aria-live="polite" className={`${READOUT_CLASS} mt-4`}>
        {overCap.length > 0
          ? `Clamped at real caps: ${overCap.join(', ')} — the rest redistributes.`
          : `Total fixed at ${totals.value} ${totals.unit}; only the split moves.`}
      </p>
    </FigureChrome>
  );
}
