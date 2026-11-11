'use client';

/**
 * Stagger / StaggerItem — sequenced entrances.
 *
 * Principle 3 (staging), 5 (follow-through & overlapping action), 9 (timing).
 *
 * The container arms once (see `useArmedReveal`), then `staggerChildren`
 * releases the items. The step is capped at 500 ms of total sequence in
 * `staggerContainer`, so a 24-card grid still finishes inside the timing
 * budget: after the fifth card the remaining items land together.
 *
 * Items carry variants only — no `initial` — which keeps SSR markup free of
 * opacity styles.
 */

import { useMemo } from 'react';
import { type HTMLMotionProps, type UseInViewOptions } from 'motion/react';
import * as m from 'motion/react-m';
import { STAGGER, SPRING } from '@/lib/motion/tokens';
import { revealVariants, staggerContainer, type RevealKind } from '@/lib/motion/variants';
import { MotionBoundary } from './MotionScope';
import { useArmedReveal } from './use-armed-reveal';

const TAGS = {
  div: m.div,
  section: m.section,
  ul: m.ul,
  ol: m.ol,
  li: m.li,
  article: m.article,
  dl: m.dl,
  header: m.header,
} as const;

type StaggerTag = keyof typeof TAGS;

export interface StaggerProps extends Omit<HTMLMotionProps<'div'>, 'children' | 'variants' | 'animate'> {
  as?: StaggerTag;
  /** Seconds between children. Default 50ms. */
  step?: number;
  /** Seconds before the first child. Default 40ms. */
  lead?: number;
  amount?: number;
  margin?: UseInViewOptions['margin'];
  once?: boolean;
  children?: React.ReactNode;
}

export function Stagger({
  as = 'div',
  step = STAGGER.item,
  lead = STAGGER.lead,
  amount = 0.15,
  margin = '0px 0px -8% 0px',
  once = true,
  className,
  children,
  ...rest
}: StaggerProps) {
  const { ref, controls } = useArmedReveal<HTMLDivElement>({ once, amount, margin });
  const variants = useMemo(() => staggerContainer(step, lead), [step, lead]);
  const Tag = TAGS[as] as typeof m.div;

  return (
    <MotionBoundary>
      <Tag ref={ref} variants={variants} animate={controls} className={className} {...rest}>
        {children}
      </Tag>
    </MotionBoundary>
  );
}

export interface StaggerItemProps extends Omit<HTMLMotionProps<'div'>, 'variants'> {
  as?: StaggerTag;
  variant?: RevealKind;
  /** Participate in layout animation when the sibling set changes. */
  layout?: boolean;
  children?: React.ReactNode;
}

export function StaggerItem({
  as = 'div',
  variant = 'rise',
  layout = false,
  className,
  children,
  ...rest
}: StaggerItemProps) {
  const Tag = TAGS[as] as typeof m.div;
  return (
    <MotionBoundary>
      <Tag
        variants={revealVariants[variant]}
        layout={layout}
        transition={layout ? { layout: SPRING.layout } : undefined}
        className={className}
        {...rest}
      >
        {children}
      </Tag>
    </MotionBoundary>
  );
}
