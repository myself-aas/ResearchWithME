'use client';

import { Printer } from 'lucide-react';

export default function PrintButton({
  label = 'Print or save as PDF',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={
        className ??
        'inline-flex min-h-11 items-center gap-2 rounded-md border border-border-strong bg-surface-raised px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-border-strong'
      }
    >
      <Printer className="h-4 w-4" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
