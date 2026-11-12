'use client';

import { cx as cn } from './cx';
import { useId } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
}

export function Input({ 
  label, 
  error, 
  hint, 
  fullWidth = true, 
  className, 
  id: providedId,
  'aria-describedby': ariaDescribedBy,
  ...props 
}: InputProps) {
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
      <input
        id={id}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={describedBy}
        className={cn(
          'h-11 w-full rounded-sm border bg-surface px-3 font-sans text-sm text-text-primary placeholder:text-text-tertiary',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
          'disabled:opacity-50 disabled:cursor-not-allowed',
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