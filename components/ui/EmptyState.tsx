/**
 * EmptyState — reme v3.1 accessible primitive (spec §7 Feedback).
 *
 * Purpose: explains why the view is empty and offers exactly one relevant action.
 * Anatomy: heading (h2/h3 per placement), explanation, single action slot.
 * States: empty (default). Props: title, children (explanation), action?.
 * Screen reader: plain heading + paragraph + action; no special semantics needed.
 * Token mapping: text-primary/secondary tokens; no card chrome (grouping via spacing, per §5).
 * Tests: lib/__tests__/ui-primitives.test.ts.
 */
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

export default function EmptyState({ title, children, action }: EmptyStateProps) {
  return (
    <div className="py-10 text-center">
      <h2 className="text-balance font-sans text-[1.375rem] font-[650] leading-[1.3] text-text-primary">{title}</h2>
      <div className="mx-auto mt-2 max-w-[65ch] font-sans text-sm text-text-secondary [&>p]:mx-auto">{children}</div>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
