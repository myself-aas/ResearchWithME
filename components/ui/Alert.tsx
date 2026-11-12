/**
 * Alert — πeme v3.1 accessible primitive (spec §7 Feedback).
 *
 * Purpose: inline feedback next to the affected object; banners for workspace-wide status.
 * Anatomy: icon (decorative, aria-hidden) + tone label (always text, never color alone) + message + optional action.
 * States: info (role="status"), success (role="status"), warning (role="status"), error (role="alert").
 * Props: tone, title, children, action?.
 * Screen reader: role announces on mount; tone is conveyed by the visible text label.
 * Token mapping: semantic surface/border/text + domain tokens (trust-verified, knowledge-contradiction, …).
 * Tests: lib/__tests__/ui-primitives.test.ts.
 */
import type { ReactNode } from 'react';
import Reveal from '@/components/motion/Reveal';

export type AlertTone = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps {
  tone: AlertTone;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

const TONE: Record<AlertTone, { role: 'status' | 'alert'; label: string; classes: string; dot: string }> = {
  info: { role: 'status', label: 'Notice', classes: 'border-border-subtle bg-surface-subtle text-ink', dot: 'bg-knowledge-insight' },
  success: { role: 'status', label: 'Verified', classes: 'border-trust-verified/40 bg-surface text-ink', dot: 'bg-trust-verified' },
  warning: { role: 'status', label: 'Caution', classes: 'border-trust-uncertain/40 bg-surface text-ink', dot: 'bg-trust-uncertain' },
  error: { role: 'alert', label: 'Error', classes: 'border-destructive/40 bg-surface text-ink', dot: 'bg-destructive' },
};

export default function Alert({ tone, title, children, action }: AlertProps) {
  const t = TONE[tone];
  return (
    <Reveal
      variant="rise"
      distance={6}
      duration={200}
      role={t.role}
      className={`flex gap-3 rounded-md border px-4 py-3 ${t.classes}`}
    >
      <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${t.dot}`} />
      <span className="font-sans text-[0.8125rem] font-semibold uppercase tracking-[0.04em]">{t.label}</span>
      <div className="min-w-0">
        <p className="font-sans text-sm font-semibold">{title}</p>
        {children ? <div className="mt-0.5 font-sans text-sm text-ink-muted">{children}</div> : null}
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </Reveal>
  );
}
