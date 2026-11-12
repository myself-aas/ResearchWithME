'use client';

/**
 * MotionPillGroup — a filter/segmented control where the selected marker is a
 * shared layout element.
 *
 * Principle 4 (pose to pose): the indicator travels between poses rather than
 * disappearing and reappearing. Principle 5 (follow-through): the layout
 * spring lets it arrive slightly after the click. Principle 11 (solid
 * drawing): the marker keeps a single, stable silhouette at every position.
 *
 * Accessibility is unchanged from a plain set of toggle buttons: the group is
 * labelled, each option is a real `<button>` with `aria-pressed`, and the
 * native focus ring is preserved. The indicator is decorative
 * (`aria-hidden`) and never the only carrier of the selected state.
 */

import { LayoutGroup } from 'motion/react';
import * as m from 'motion/react-m';
import { SPRING } from '@/lib/motion/tokens';
import { MotionBoundary } from './MotionScope';
import { Text } from '@/components/primitives';

export interface MotionPillOption {
  id: string;
  label: string;
  /** Optional count rendered as metadata inside the pill. */
  count?: number;
}

export interface MotionPillGroupProps {
  options: readonly MotionPillOption[];
  value: string;
  onValueChange: (value: string) => void;
  /** Accessible name for the group. */
  label: string;
  /** Visible label rendered above the group. */
  caption?: string;
  /** Unique indicator id — two groups on a page must not share one. */
  groupId: string;
  className?: string;
  optionClassName?: string;
  indicatorClassName?: string;
  activeTextClassName?: string;
  idleTextClassName?: string;
}

export default function MotionPillGroup({
  options,
  value,
  onValueChange,
  label,
  caption,
  groupId,
  className = '',
  optionClassName = '',
  indicatorClassName = 'bg-ink',
  activeTextClassName = 'text-canvas',
  idleTextClassName = 'text-ink-secondary hover:text-ink',
}: MotionPillGroupProps) {
  return (
    <MotionBoundary>
      <div>
        {caption ? (
          <Text as="p" variant="eyebrow" color="secondary" className="mb-2">{caption}</Text>
        ) : null}
        <LayoutGroup id={groupId}>
          <div role="group" aria-label={label} className={`flex flex-wrap gap-1.5 ${className}`}>
            {options.map((option) => {
              const active = option.id === value;
              return (
                <m.button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onValueChange(option.id)}
                  whileTap={{ scale: 0.97 }}
                  className={`relative inline-flex min-h-10 items-center gap-1.5 rounded-sm border px-3 py-1.5 font-sans text-xs font-medium transition-colors ${
                    active
                      ? `border-brand ${activeTextClassName}`
                      : `border-line bg-surface ${idleTextClassName} hover:bg-surface-subtle`
                  } ${optionClassName}`}
                >
                  {active ? (
                    <m.span
                      layoutId={`${groupId}-indicator`}
                      aria-hidden="true"
                      className={`absolute inset-0 rounded-sm ${indicatorClassName}`}
                      transition={{ layout: SPRING.layout }}
                    />
                  ) : null}
                  <span className="relative z-10">{option.label}</span>
                  {typeof option.count === 'number' ? (
                    <span className="relative z-10 font-mono text-xs tabular-nums opacity-75">
                      {option.count}
                    </span>
                  ) : null}
                </m.button>
              );
            })}
          </div>
        </LayoutGroup>
      </div>
    </MotionBoundary>
  );
}
