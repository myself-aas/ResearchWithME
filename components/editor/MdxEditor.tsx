'use client';

import dynamic from 'next/dynamic';
import { FileCode2 } from 'lucide-react';

/**
 * The one MDX editing surface for every studio.
 *
 * The writer studio (`/write`), the dashboard studio (`PostEditor`) and the
 * scholarly workspace (`/editor`) all render this component, so the toolbar,
 * typography, image handling, and Markdown/MDX behaviour cannot drift apart
 * again. Plate is loaded client-side only: it owns the document model and has
 * nothing useful to render on the server.
 */
const PlateBodyEditor = dynamic(() => import('./PlateBodyEditor'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[16rem] animate-pulse rounded-lg border border-line bg-surface-subtle" aria-hidden="true" />
  ),
});

export interface MdxEditorProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  onUploadImage?: (file: File) => Promise<string>;
  /** Hide the "MDX" wordmark when the surrounding card already names the field. */
  hideBadge?: boolean;
}

export default function MdxEditor({
  id,
  value,
  onChange,
  label,
  hint = 'Markdown with safe MDX blocks. The toolbar covers bold, italic, lists, quotes, code, and image uploads.',
  error,
  disabled,
  onUploadImage,
  hideBadge = false,
}: MdxEditorProps) {
  return (
    <div>
      {label || !hideBadge ? (
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          {label ? (
            <label htmlFor={id} className="font-sans text-sm font-medium text-ink">
              {label}
            </label>
          ) : (
            <span />
          )}
          {hideBadge ? null : (
            <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold uppercase tracking-wider text-ink-secondary">
              <FileCode2 className="h-3.5 w-3.5" aria-hidden="true" />
              MDX
            </span>
          )}
        </div>
      ) : null}
      <PlateBodyEditor
        id={id}
        value={value}
        onChange={onChange}
        error={error}
        disabled={disabled}
        onUploadImage={onUploadImage}
      />
      <p className="mt-1 font-sans text-xs leading-relaxed text-ink-secondary">{hint}</p>
    </div>
  );
}
