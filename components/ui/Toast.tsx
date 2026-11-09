'use client';

/**
 * Toast / ToastRegion — πeme v3.1 accessible primitive (spec §7 Feedback).
 *
 * Purpose: noncritical confirmation only — never contains essential next steps.
 * Anatomy: region (aria-live="polite", aria-label="Notifications") containing toasts (role="status").
 * States: visible → auto-dismiss after `duration` ms (0 = sticky).
 * Screen reader: polite live region announces each toast; focus is never moved.
 * Motion: entrance uses the 200ms reveal duration; honors prefers-reduced-motion via globals.css.
 * Token mapping: surface-raised, border-subtle, shadow-floating, text tokens.
 * Tests: lib/__tests__/ui-primitives.test.ts. Migration: replaces ad-hoc inline confirmations.
 */
import { useEffect, useState, type ReactNode } from 'react';

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
    const t = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, duration);
    return () => clearTimeout(t);
  }, [duration, onDismiss]);
  if (!visible) return null;
  return (
    <div
      role="status"
      className="pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-md border border-line bg-surface-raised px-4 py-3 shadow-floating"
    >
      <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${TONE_DOT[tone]}`} />
      <p className="font-sans text-sm text-text-primary">{message}</p>
    </div>
  );
}

export interface ToastRegionProps {
  toasts: Array<ToastProps & { id: string }>;
  onDismiss?: (id: string) => void;
  children?: ReactNode;
}

export function ToastRegion({ toasts, onDismiss }: ToastRegionProps) {
  return (
    <div aria-live="polite" aria-label="Notifications" className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {toasts.map((t) => (
        <Toast key={t.id} {...t} onDismiss={() => onDismiss?.(t.id)} />
      ))}
    </div>
  );
}
