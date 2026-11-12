'use client';

import { cx as cn } from './cx';
import { useId } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
}

export function Select({ 
  label, 
  error, 
  hint, 
  options, 
  placeholder, 
  fullWidth = true, 
  className, 
  id: providedId,
  'aria-describedby': ariaDescribedBy,
  ...props 
}: SelectProps) {
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
      <select
        id={id}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={describedBy}
        className={cn(
          'h-11 w-full rounded-sm border bg-surface px-3 font-sans text-sm text-text-primary',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error ? 'border-destructive focus-visible:outline-destructive' : 'border-line',
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
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