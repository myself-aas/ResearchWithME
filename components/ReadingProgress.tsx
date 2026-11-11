'use client';

/**
 * ReadingProgress — the scroll-linked indicator at the top of the reading
 * surface.
 *
 * Principle 6 (slow in/slow out) applied to a motion the *reader* drives: the
 * raw scroll position is spring-smoothed (see `useScrollProgress`) so anchor
 * jumps and trackpad flings do not snap the bar. Principle 11 (solid drawing):
 * the track is 2px, the fill is the brand token, and the geometry never
 * changes height. Principle 9 (timing): no transition is longer than the
 * spring's settle; the bar is never allowed to lag behind the page.
 *
 * Accessibility is unchanged: a labelled `progressbar` with live
 * `aria-valuenow` (rounded to whole percent so assistive tech is not spammed
 * every frame), and `print:hidden`.
 */

import * as m from 'motion/react-m';
import { useScrollProgress } from '@/lib/motion/hooks';

export default function ReadingProgress() {
  const { smooth, percent } = useScrollProgress();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 print:hidden"
      role="progressbar"
      aria-label="Reading progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <m.div
        className="h-full origin-left bg-brand"
        style={{ scaleX: smooth }}
        aria-hidden="true"
      />
    </div>
  );
}
