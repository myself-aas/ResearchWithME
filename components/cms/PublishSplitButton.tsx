'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Send } from 'lucide-react';
import type { PublicationType } from '@/lib/blog-data';
import { cn } from '@/lib/utils';

const PUBLICATION_OPTIONS: Array<{
  value: PublicationType;
  label: string;
  description: string;
}> = [
  {
    value: 'review',
    label: 'Review',
    description: 'Standard research or artifact review',
  },
  {
    value: 'editorial',
    label: 'Editorial',
    description: 'Published with an Editorial badge',
  },
];

interface PublishSplitButtonProps {
  id?: string;
  value: PublicationType;
  onChange: (next: PublicationType) => void;
  label: string;
  disabled?: boolean;
  submitType?: 'button' | 'submit';
  onPublish?: () => void;
  radius?: 'full' | 'md';
}

export default function PublishSplitButton({
  id,
  value,
  onChange,
  label,
  disabled = false,
  submitType = 'button',
  onPublish,
  radius = 'full',
}: PublishSplitButtonProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const activeIndex = Math.max(
      0,
      PUBLICATION_OPTIONS.findIndex((option) => option.value === value),
    );
    itemRefs.current[activeIndex]?.focus();
  }, [open, value]);

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const count = PUBLICATION_OPTIONS.length;
    const currentIndex = itemRefs.current.findIndex((item) => item === document.activeElement);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      itemRefs.current[(currentIndex + 1 + count) % count]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      itemRefs.current[(currentIndex - 1 + count) % count]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      itemRefs.current[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      itemRefs.current[count - 1]?.focus();
    }
  }

  function selectOption(next: PublicationType) {
    onChange(next);
    setOpen(false);
    triggerRef.current?.focus();
  }

  const leftRadius = radius === 'full' ? 'rounded-l-full' : 'rounded-l-md';
  const rightRadius = radius === 'full' ? 'rounded-r-full' : 'rounded-r-md';
  const outerRadius = radius === 'full' ? 'rounded-full' : 'rounded-md';

  return (
    <div ref={containerRef} className="relative inline-flex">
      <div className={cn('inline-flex items-stretch shadow-xs', outerRadius)}>
        <button
          type={submitType}
          onClick={submitType === 'button' ? onPublish : undefined}
          disabled={disabled}
          className={cn(
            'inline-flex min-h-11 items-center gap-2 bg-brand pl-5 pr-4 text-sm font-semibold text-on-primary transition-colors hover:bg-brand-hover active:bg-brand-pressed focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60',
            leftRadius,
          )}
        >
          <Send className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{label}</span>
        </button>

        <span aria-hidden="true" className="w-px self-stretch bg-on-primary/25" />

        <button
          ref={triggerRef}
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          aria-label="Choose publication type"
          onClick={() => setOpen((previous) => !previous)}
          className={cn(
            'inline-flex min-h-11 items-center justify-center bg-brand pl-3 pr-3.5 text-on-primary transition-colors hover:bg-brand-hover active:bg-brand-pressed focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60',
            rightRadius,
          )}
        >
          <ChevronDown
            className={cn('h-4 w-4 transition-transform duration-150', open && 'rotate-180')}
            aria-hidden="true"
          />
        </button>
      </div>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Publication type"
          onKeyDown={handleMenuKeyDown}
          className="absolute bottom-full right-0 z-30 mb-2 min-w-56 overflow-hidden rounded-xl border border-line bg-surface-raised p-1.5 text-ink shadow-raised"
        >
          {PUBLICATION_OPTIONS.map((option, index) => {
            const selected = value === option.value;
            return (
              <button
                key={option.value}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => selectOption(option.value)}
                className={cn(
                  'flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                  selected
                    ? 'bg-selection text-brand'
                    : 'text-ink hover:bg-surface',
                )}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className="block text-xs text-ink-secondary">{option.description}</span>
                </span>
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                  {selected && <Check className="h-4 w-4 text-brand" aria-hidden="true" />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
