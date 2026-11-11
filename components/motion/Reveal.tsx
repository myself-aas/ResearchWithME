'use client';

/**
 * Reveal — scroll-triggered entrance for content below the fold.
 *
 * Principles: anticipation (offset), arcs (variant="arc"), squash & stretch
 * (variant="squash"), staging (variant="mask"/"stage"), slow in/out (tokens),
 * follow-through (delay/index), appeal (the sum).
 *
 * **Why animation controls instead of `initial`:** πeme renders content
 * without JavaScript (SSR, print, crawlers), so the first paint must never be
 * hidden by the animation. `useArmedReveal` measures the element on mount and
 * only adopts the hidden pose when it is genuinely below the fold — via
 * `controls.set` inside a layout effect, i.e. before the browser paints.
 * Elements already on screen are never touched (the CSS page settle in
 * globals.css plays that beat).
 *
 * Rules encoded here (animation-principles: scroll + entrance skills):
 *  - threshold 15–20% visible; trigger margin keeps the reveal ahead of the
 *    reader rather than under their eyes;
 *  - one-shot by default (`once`) — content never re-hides while scrolling;
 *  - `prefers-reduced-motion` / πeme `reduced`+`static` modes skip arming
 *    entirely, so the element simply is.
 */

import { useMemo } from 'react';
import { type HTMLMotionProps, type TargetAndTransition, type Transition, type UseInViewOptions } from 'motion/react';
import * as m from 'motion/react-m';
import { EASING } from '@/lib/motion/tokens';
import { revealVariants, withDelay, type RevealKind } from '@/lib/motion/variants';
import { MotionBoundary } from './MotionScope';
import { useArmedReveal } from './use-armed-reveal';

const TAGS = {
  div: m.div,
  section: m.section,
  article: m.article,
  aside: m.aside,
  figure: m.figure,
  footer: m.footer,
  header: m.header,
  li: m.li,
  ul: m.ul,
  ol: m.ol,
  p: m.p,
  span: m.span,
} as const;

export type RevealTag = keyof typeof TAGS;

export interface RevealProps extends Omit<HTMLMotionProps<'div'>, 'children' | 'variants' | 'animate'> {
  /** Element to render. Defaults to `div`. */
  as?: RevealTag;
  /** Which principle-driven pose to use. Defaults to `rise`. */
  variant?: RevealKind;
  /** Milliseconds of extra delay (converted to seconds). */
  delay?: number;
  /** Optional index; multiplied by `step` and capped at the stagger budget. */
  index?: number;
  /** Seconds between indexed siblings. Default 50ms. */
  step?: number;
  /** Override the travel distance in px (e.g. 6px for inline feedback). */
  distance?: number;
  /** Override the animation length in ms. */
  duration?: number;
  /** Fraction of the element that must be visible. Default 0.18. */
  amount?: number;
  /** IntersectionObserver root margin. */
  margin?: UseInViewOptions['margin'];
  /** Re-arm when the element leaves the viewport (rarely wanted). */
  once?: boolean;
  children?: React.ReactNode;
}

export default function Reveal({
  as = 'div',
  variant = 'rise',
  delay = 0,
  index,
  step = 0.05,
  distance,
  duration,
  amount = 0.18,
  margin = '0px 0px -10% 0px',
  once = true,
  className,
  children,
  ...rest
}: RevealProps) {
  const { ref, controls } = useArmedReveal<HTMLDivElement>({ once, amount, margin });

  const variants = useMemo(() => {
    const inline = index !== undefined ? Math.min(Math.max(index, 0) * step, 0.5) : 0;
    const base = revealVariants[variant];
    if (distance === undefined && duration === undefined) {
      return withDelay(base, inline + delay / 1000);
    }
    // Local overrides for small surfaces (alerts, inline notes): the pose is
    // still the registry pose, only its travel and length are tightened.
    const hidden = { ...(base.hidden as TargetAndTransition) };
    const visible = { ...(base.visible as TargetAndTransition) };
    if (distance !== undefined) hidden.y = distance;
    if (duration !== undefined) {
      visible.transition = {
        ...(visible.transition as Transition),
        duration: duration / 1000,
        ease: [...EASING.enter],
      };
    }
    return withDelay({ hidden, visible }, inline + delay / 1000);
  }, [variant, delay, index, step, distance, duration]);

  const Tag = TAGS[as] as typeof m.div;

  return (
    <MotionBoundary>
      <Tag ref={ref} variants={variants} animate={controls} className={className} {...rest}>
        {children}
      </Tag>
    </MotionBoundary>
  );
}
