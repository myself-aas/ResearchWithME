'use client';

/**
 * Loading primitives — the system's honest answer to "is anything happening?"
 *
 * Timings come from the animation-principles loading-states skill and are
 * enforced by `useDelayedLoading`:
 *  - an indicator appears only after 200ms (fast responses never flash);
 *  - once shown it stays at least 500ms (no jarring blink);
 *  - the shimmer cycle is 1500ms and runs **at most three times** — reme §7
 *    forbids indefinite shimmer, while the skill's rhythm is preserved;
 *  - every skeleton mirrors the shape of the content it replaces
 *    (solid drawing / staging), so the swap does not reflow.
 *
 * Accessibility: skeletons are `aria-hidden`; the surrounding region carries
 * `role="status"` with a text label (`aria-busy` on the container). Under
 * `prefers-reduced-motion` the shimmer stops and a static surface remains.
 */

import * as m from 'motion/react-m';
import { useDelayedLoading, useHydratedReducedMotion } from '@/lib/motion/hooks';
import { DURATION_MS } from '@/lib/motion/tokens';
import { MotionBoundary } from './MotionScope';

export interface SpinnerProps {
  /** Diameter in px. Default 16. */
  size?: number;
  className?: string;
  /** Accessible text; the caller usually provides it on the live region. */
  label?: string;
}

/** Rotating arc. Linear motion is deliberate here: a spinner has no "landing". */
export function Spinner({ size = 16, className = '', label }: SpinnerProps) {
  return (
    <MotionBoundary>
      <m.span
        className={`inline-flex ${className}`}
        role={label ? 'img' : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : 'true'}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.75, ease: 'linear', repeat: Infinity }}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
          <path
            d="M12 3a9 9 0 0 1 9 9"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </m.span>
    </MotionBoundary>
  );
}

export interface SkeletonShardProps {
  className?: string;
  /** Inline height; defaults to a text line. */
  height?: number | string;
  width?: number | string;
  /** Number of stacked shards (last one shortened, like a paragraph). */
  lines?: number;
  /** Rounded corner token class. */
  rounded?: string;
}

/**
 * A single skeleton block with a bounded shimmer.
 * The gradient is built from the reme surface tokens, not literals.
 */
export function SkeletonShard({
  className = '',
  height = 16,
  width = '100%',
  lines = 1,
  rounded = 'rounded-sm',
}: SkeletonShardProps) {
  const shimmer = !useHydratedReducedMotion();
  const shards = Array.from({ length: lines }, (_, index) => {
    const isLast = index === lines - 1 && lines > 1;
    return (
      <m.span
        key={index}
        aria-hidden="true"
        className={`block bg-surface-subtle ${rounded} ${className}`}
        style={{
          height,
          width: isLast ? '66%' : width,
          marginBottom: index === lines - 1 ? 0 : 8,
          backgroundImage:
            'linear-gradient(90deg, var(--color-surface-subtle) 0%, var(--color-surface) 50%, var(--color-surface-subtle) 100%)',
          backgroundSize: '200% 100%',
        }}
        initial={false}
        animate={shimmer ? { backgroundPosition: ['200% 0%', '-200% 0%'] } : undefined}
        transition={
          !shimmer
            ? undefined
            : {
                duration: DURATION_MS.synthesize * 2.15 / 1000,
                ease: 'easeInOut',
                repeat: 2,
                repeatType: 'loop',
              }
        }
      />
    );
  });

  return <MotionBoundary>{lines > 1 ? <div aria-hidden="true">{shards}</div> : shards[0]}</MotionBoundary>;
}

export interface LoadingStateProps {
  /** What is loading, in product language ("Loading provenance graph"). */
  label: string;
  /** Show immediately (useful inside a dialog that just opened). */
  immediate?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/** Delayed, minimum-duration loading region. */
export function LoadingState({ label, immediate = false, className = '', children }: LoadingStateProps) {
  const visible = useDelayedLoading(true, immediate ? { delay: 0, minDuration: 0 } : { delay: 200, minDuration: 500 });

  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className} data-loading-visible={visible}>
      <span className="sr-only">{label}</span>
      {visible ? (
        children ?? (
          <div className="flex items-center gap-2 font-sans text-xs text-ink-secondary">
            <Spinner size={14} />
            <span aria-hidden="true">{label}</span>
          </div>
        )
      ) : (
        <span aria-hidden="true" className="block min-h-4" />
      )}
    </div>
  );
}
