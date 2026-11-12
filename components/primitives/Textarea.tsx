'use client';

import { cx as cn } from './cx';
import { useId } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
  rows?: number;
}

export function Textarea({ 
  label, 
  error, 
  hint, 
  fullWidth = true, 
  rows = 4,
  className, 
  id: providedId,
  'aria-describedby': ariaDescribedBy,
  ...props 
}: TextareaProps) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [errorId, hintId, ariaDescribedBy].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn(fullWidth && 'w-full')}>
      {label && (
        <label 
          htmlFor={id} 
          className="mb-1.5 block font-sans text-sm font-medium text-text-primary"
        >
          {label}
        </label>
      )}
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={describedBy}
        className={cn(
          'w-full rounded-sm border bg-surface px-3 py-2.5 font-sans text-sm text-text-primary placeholder:text-text-tertiary',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
          'disabled:opacity-50 disabled:cursor-not-allowed resize-y min-h-[100px]',
          error ? 'border-destructive focus-visible:outline-destructive' : 'border-line',
          className
        )}
        {...props}
      />
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 font-sans text-xs text-destructive">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 font-sans text-xs text-text-tertiary">
          {hint}
        </p>
      )}
    </div>
  );
}