/**
 * Skeleton — πeme v3.1 accessible primitive (spec §7 Feedback).
 *
 * Purpose: loading placeholder that mirrors the final layout; must not shimmer indefinitely.
 * Anatomy: aria-hidden blocks shaped like the content they replace.
 * Screen reader: purely decorative — aria-hidden="true"; the loading state itself is
 * announced by the surrounding role="status" live region (see PageState).
 * Motion: pulse animation collapses under prefers-reduced-motion (globals.css §9 contract).
 * Token mapping: surface-subtle blocks on surface.
 */
export interface SkeletonProps {
  className?: string;
  lines?: number;
}

export default function Skeleton({ className = '', lines = 1 }: SkeletonProps) {
  return (
    <div aria-hidden="true" className={className}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={`animate-pulse rounded-sm bg-surface-subtle ${i === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full'}`}
          style={{ height: '1rem', marginBottom: i === lines - 1 ? 0 : '0.5rem' }}
        />
      ))}
    </div>
  );
}
