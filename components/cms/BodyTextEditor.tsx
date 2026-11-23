'use client';

import { AlertCircle, Info } from 'lucide-react';
import WarmTooltip from '@/components/WarmTooltip';
import { CMS_LIMITS } from '@/lib/cms/schema';
import { cn } from '@/lib/utils';
import { inlineErrorClass } from './styles';

interface BodyTextEditorProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

/** Dashboard-only text field; other writing surfaces keep their MDX editor. */
export default function BodyTextEditor({ id, value, onChange, error, disabled }: BodyTextEditorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          Text<span className="sr-only"> body</span>
        </label>
        <WarmTooltip
          content="Text input · no rich-text toolbar"
          side="top"
          surfaceColor="var(--reme-surface-inverse)"
          inkColor="var(--reme-text-inverse)"
          disabled={disabled}
        >
          <button
            type="button"
            aria-label="About the body text editor"
            disabled={disabled}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50"
          >
            <Info className="h-4 w-4" aria-hidden="true" />
          </button>
        </WarmTooltip>
      </div>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        maxLength={CMS_LIMITS.content}
        rows={14}
        placeholder="Write your article here…"
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
        className={cn(
          'min-h-80 w-full resize-y rounded-xl border bg-surface-raised p-4 font-sans text-base leading-relaxed text-ink placeholder:text-ink-secondary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand disabled:opacity-60',
          error ? 'border-destructive' : 'border-border-strong',
        )}
      />
      <p id={`${id}-hint`} className="text-sm leading-relaxed text-ink-secondary">
        Write directly in text. Existing Markdown remains editable here; articles still render Markdown when published.
      </p>
      {error && (
        <p id={`${id}-error`} role="alert" className={inlineErrorClass}>
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
