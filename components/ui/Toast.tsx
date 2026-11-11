'use client';

/**
 * Toast / ToastRegion — πeme v3.1 accessible primitive (spec §7 Feedback).
 *
 * Purpose: noncritical confirmation only — never contains essential next steps.
 * Anatomy: region (aria-live="polite", aria-label="Notifications") containing toasts (role="status").
 * States: visible → auto-dismiss after `duration` ms (0 = sticky).
 * Screen reader: polite live region announces each toast; focus is never moved.
 * Token mapping: surface-raised, border-subtle, shadow-floating, text tokens.
 *
 * Motion (entrance 200ms, exit 160ms):
 * - anticipation (principle 2): the toast drops in from 8px above its resting
 *   position, previewing where it came from;
 * - follow-through (principle 5): stacked toasts push each other with a layout
 *   spring instead of jumping;
 * - appeal (principle 12): dismissal is graceful — the exit completes before
 *   the parent removes the item, so nothing pops out of existence.
 *
 * Tests: lib/__tests__/ui-primitives.test.ts. Migration: replaces ad-hoc inline confirmations.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { EASING, SPRING } from '@/lib/motion/tokens';
import { MotionBoundary } from '@/components/motion/MotionScope';

export interface ToastProps {
  message: string;
  tone?: 'info' | 'success' | 'error';
  duration?: number;
  onDismiss?: () => void;
}

const TONE_DOT: Record<NonNullable<ToastProps['tone']>, string> = {
  info: 'bg-knowledge-insight',
  success: 'bg-trust-verified',
  error: 'bg-action-destructive',
};

export function Toast({ message, tone = 'info', duration = 4000, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!duration) return;
    const timer = window.setTimeout(() => setVisible(false), duration);
    return () => window.clearTimeout(timer);
  }, [duration]);

  return (
    <MotionBoundary>
      <AnimatePresence onExitComplete={() => onDismiss?.()}>
        {visible ? (
          <m.div
            key="pieme-toast"
            role="status"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.16, ease: [...EASING.exit] } }}
            transition={SPRING.lift}
            className="pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-md border border-line bg-surface-raised px-4 py-3 shadow-floating"
          >
            <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${TONE_DOT[tone]}`} />
            <p className="font-sans text-sm text-text-primary">{message}</p>
          </m.div>
        ) : null}
      </AnimatePresence>
    </MotionBoundary>
  );
}

export interface ToastRegionProps {
  toasts: Array<ToastProps & { id: string }>;
  onDismiss?: (id: string) => void;
  children?: ReactNode;
}

export function ToastRegion({ toasts, onDismiss }: ToastRegionProps) {
  return (
    <MotionBoundary>
      <div
        aria-live="polite"
        aria-label="Notifications"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <m.div key={toast.id} layout transition={{ layout: SPRING.layout }}>
              <Toast {...toast} onDismiss={() => onDismiss?.(toast.id)} />
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    </MotionBoundary>
  );
}
