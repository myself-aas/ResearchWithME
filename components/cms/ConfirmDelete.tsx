'use client';

import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { dangerButtonClass, secondaryButtonClass } from './styles';

interface ConfirmDeleteProps {
  onConfirm: () => void;
  busy?: boolean;
  label?: string;
  question?: string;
  busyLabel?: string;
}

/**
 * Two-step delete control. Replacing a modal with an inline confirmation keeps
 * focus management simple and avoids trapping keyboard users in a dialog.
 */
export default function ConfirmDelete({
  onConfirm,
  busy = false,
  label = 'Delete',
  question = 'Delete permanently?',
  busyLabel = 'Deleting…',
}: ConfirmDeleteProps) {
  const [confirming, setConfirming] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={dangerButtonClass}
        aria-label={`${label} — asks for confirmation`}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <span role="group" aria-label="Confirm deletion" className="inline-flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-red-800">{question}</span>
      <button ref={confirmRef} type="button" onClick={onConfirm} disabled={busy} className={dangerButtonClass}>
        {busy ? busyLabel : 'Yes, delete'}
      </button>
      <button type="button" onClick={() => setConfirming(false)} disabled={busy} className={secondaryButtonClass}>
        Cancel
      </button>
    </span>
  );
}
