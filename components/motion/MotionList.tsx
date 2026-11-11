'use client';

/**
 * MotionList / MotionItem — pose-to-pose lists.
 *
 * Principle 4 (straight ahead vs pose to pose): filtering a catalogue is a
 * change of pose, not a recomposition. Remaining items glide to their new
 * positions (`layout`), departing items leave deliberately (exit), arriving
 * items fade in (`initial={false}` prevents a first-paint flash).
 *
 * Principle 5 (follow-through): the layout spring carries the eye from the old
 * position to the new one instead of teleporting.
 *
 * SSR: `AnimatePresence` renders its children normally on the server and
 * `initial={false}` keeps inline styles out of the markup.
 */

import { AnimatePresence, type HTMLMotionProps } from 'motion/react';
import * as m from 'motion/react-m';
import { SPRING, TRANSITION } from '@/lib/motion/tokens';
import { MotionBoundary } from './MotionScope';

const TAGS = {
  ul: m.ul,
  ol: m.ol,
  div: m.div,
  dl: m.dl,
} as const;

type ListTag = keyof typeof TAGS;

export interface MotionListProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  as?: ListTag;
  children?: React.ReactNode;
}

export function MotionList({ as = 'ul', className, children, ...rest }: MotionListProps) {
  const Tag = TAGS[as] as typeof m.div;
  return (
    <MotionBoundary>
      <Tag layout className={className} {...rest}>
        <AnimatePresence initial={false} mode="popLayout">
          {children}
        </AnimatePresence>
      </Tag>
    </MotionBoundary>
  );
}

export interface MotionItemProps extends Omit<HTMLMotionProps<'li'>, 'children'> {
  as?: 'li' | 'div';
  children?: React.ReactNode;
}

export function MotionItem({ as = 'li', className, children, ...rest }: MotionItemProps) {
  const Tag = (as === 'li' ? m.li : m.div) as typeof m.li;
  return (
    <Tag
      layout
      initial={false}
      exit={{ opacity: 0, scale: 0.985, y: -4, transition: TRANSITION.fast }}
      transition={{ layout: SPRING.layout }}
      className={className}
      {...rest}
    >
      {children}
    </Tag>
  );
}
