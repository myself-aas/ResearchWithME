'use client';

/**
 * Dialog — πeme v3.1 accessible primitive (spec §7 Feedback, §27 contract).
 *
 * Purpose: modal conversation that blocks interaction with the rest of the page.
 * Anatomy: backdrop + panel (role="dialog", aria-modal) with labelledby title.
 * States: open/closed. Props: open, onClose, title, description?, children.
 * Keyboard: Esc closes; Tab/Shift+Tab cycle within the panel (focus trap).
 * Focus: moves into the panel on open, returns to the trigger on close.
 * Screen reader: announces via role="dialog" + aria-labelledby/aria-describedby.
 * Responsive: full-width sheet under the sm breakpoint (36rem).
 * Token mapping: surface/border/text/focus tokens only; shadow-dialog elevation.
 *
 * Motion (πeme §9 "reveal", 200–320ms):
 * - staging (principle 3): the backdrop dims first, the panel arrives over it;
 * - solid drawing (principle 11): the sheet rises from its anchored edge
 *   (bottom on mobile, centre on desktop) rather than scaling from nowhere;
 * - follow-through (principle 5): the panel's spring settles ~120ms after the
 *   backdrop, so dismissal reads as one object leaving, not two.
 * Exit animations run through AnimatePresence; `prefers-reduced-motion`
 * collapses transforms while keeping the opacity fade that signals the change.
 *
 * Tests: lib/__tests__/ui-primitives.test.ts. Migration: replaces ad-hoc overlays.
 */
import { useEffect, useRef, type ReactNode, type KeyboardEvent } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { EASING, SPRING } from '@/lib/motion/tokens';
import { MotionBoundary } from '@/components/motion/MotionScope';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Dialog({ open, onClose, title, description, children }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement;
    const panel = panelRef.current;
    const focusables = panel?.querySelectorAll<HTMLElement>(FOCUSABLE);
    (focusables && focusables.length > 0 ? focusables[0] : panel)?.focus();
    return () => {
      (restoreRef.current as HTMLElement | null)?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const focusables = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <MotionBoundary>
      <AnimatePresence>
        {open ? (
          <m.div
            key="pieme-dialog"
            className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
            initial={{ opacity: 1 }}
            exit={{ opacity: 1 }}
          >
            <m.div
              key="pieme-dialog-backdrop"
              className="absolute inset-0 bg-stone-950/50"
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: [...EASING.standard] }}
              onClick={onClose}
            />

            <m.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="pieme-dialog-title"
              aria-describedby={description ? 'pieme-dialog-desc' : undefined}
              tabIndex={-1}
              onKeyDown={onKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-t-xl border border-line bg-surface p-6 shadow-dialog outline-none sm:rounded-xl"
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.985, transition: { duration: 0.16, ease: [...EASING.exit] } }}
              transition={SPRING.panel}
              style={{ transformOrigin: '50% 100%' }}
            >
              <h2 id="pieme-dialog-title" className="text-balance font-sans text-[1.375rem] font-[650] leading-[1.3] text-ink">
                {title}
              </h2>
              {description ? (
                <p id="pieme-dialog-desc" className="mt-1 text-sm text-ink-muted">
                  {description}
                </p>
              ) : null}
              <div className="mt-4">{children}</div>
            </m.div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </MotionBoundary>
  );
}
