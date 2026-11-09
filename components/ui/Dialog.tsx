'use client';

/**
 * Dialog — πeme v3.1 accessible primitive (spec §7 Feedback, §27 contract).
 *
 * Purpose: modal conversation that blocks interaction with the rest of the page.
 * Anatomy: backdrop + panel (role="dialog", aria-modal) with labelledby title.
 * States: open/closed. Props: open, onClose, title, description?, children, initialFocus?.
 * Keyboard: Esc closes; Tab/Shift+Tab cycle within the panel (focus trap).
 * Focus: moves into the panel on open, returns to the trigger on close.
 * Screen reader: announces via role="dialog" + aria-labelledby/aria-describedby.
 * Responsive: full-width sheet under the sm breakpoint (36rem).
 * Token mapping: surface/border/text/focus tokens only; shadow-dialog elevation.
 * Tests: lib/__tests__/ui-primitives.test.ts. Migration: replaces ad-hoc overlays.
 */
import { useEffect, useRef, type ReactNode, type KeyboardEvent } from 'react';

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

  if (!open) return null;

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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/50 p-0 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pieme-dialog-title"
        aria-describedby={description ? 'pieme-dialog-desc' : undefined}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-xl border border-line bg-surface p-6 shadow-dialog outline-none sm:rounded-xl"
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
      </div>
    </div>
  );
}
