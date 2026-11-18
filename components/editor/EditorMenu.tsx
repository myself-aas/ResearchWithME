'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';

interface EditorMenuProps {
  label: string;
  id?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Focus returns here after Escape or a menu choice. */
  triggerRef?: RefObject<HTMLElement | null>;
  /** Anchor the menu to a trigger instead of a CSS-positioned class. */
  anchorRef?: RefObject<HTMLElement | null>;
  placement?: 'bottom-start' | 'top-end';
  className?: string;
}

/**
 * Small menu used by the heading split button and the mobile FAB menu.
 * Arrow keys, Home/End, Escape and outside pointerdown are handled here so
 * both triggers behave the same way.
 */
export default function EditorMenu({
  label,
  id,
  open,
  onClose,
  children,
  triggerRef,
  anchorRef,
  placement = 'bottom-start',
  className = '',
}: EditorMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [anchoredStyle, setAnchoredStyle] = useState<CSSProperties | null>(anchorRef ? null : {});

  useLayoutEffect(() => {
    const ref = anchorRef;
    if (!open || !ref) return;
    function place() {
      const anchor = ref?.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const width = menuRef.current?.offsetWidth || 208;
      if (placement === 'top-end') {
        setAnchoredStyle({
          position: 'fixed',
          right: Math.max(8, window.innerWidth - rect.right),
          bottom: Math.max(8, window.innerHeight - rect.top + 8),
          width,
        });
      } else {
        const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - width - 8));
        setAnchoredStyle({ position: 'fixed', top: rect.bottom + 4, left, width });
      }
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [anchorRef, open, placement]);

  useEffect(() => {
    if (!open) return;
    const menu = menuRef.current;
    const items = () =>
      menu ? Array.from(menu.querySelectorAll<HTMLElement>('[role^="menuitem"]')) : [];

    items()[0]?.focus();

    function onPointerDown(event: PointerEvent) {
      if (!menu || menu.contains(event.target as Node) || triggerRef?.current?.contains(event.target as Node)) {
        return;
      }
      closeRef.current();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        triggerRef?.current?.focus();
        return;
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      const entries = items();
      if (entries.length === 0) return;
      event.preventDefault();
      const index = entries.indexOf(document.activeElement as HTMLElement);
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? entries.length - 1
            : event.key === 'ArrowDown'
              ? (index + 1 + entries.length) % entries.length
              : (index - 1 + entries.length) % entries.length;
      entries[next]?.focus();
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, triggerRef]);

  if (!open) return null;

  return (
    <div
      ref={menuRef}
      id={id}
      role="menu"
      aria-label={label}
      style={anchoredStyle ?? undefined}
      className={`z-[65] min-w-52 overflow-hidden rounded-2xl border border-line bg-surface p-1 shadow-floating ${className}`}
    >
      {children}
    </div>
  );
}

export function EditorMenuItem({
  children,
  onSelect,
  checked,
  disabled,
  icon,
  description,
}: {
  children: ReactNode;
  onSelect: () => void;
  checked?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  description?: string;
}) {
  return (
    <button
      type="button"
      role={typeof checked === 'boolean' ? 'menuitemradio' : 'menuitem'}
      aria-checked={typeof checked === 'boolean' ? checked : undefined}
      disabled={disabled}
      onClick={onSelect}
      className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-40"
    >
      {icon ? <span className="flex h-5 w-5 shrink-0 items-center justify-center text-ink-secondary">{icon}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{children}</span>
        {description ? <span className="mt-0.5 block text-xs leading-snug text-ink-secondary">{description}</span> : null}
      </span>
      {checked ? <span className="ml-1 h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" /> : null}
    </button>
  );
}
