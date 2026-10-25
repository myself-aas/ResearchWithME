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
        'inline-flex min-h-11 items-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 transition-colors hover:border-stone-400'
      }
    >
      <Printer className="h-4 w-4" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
