'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Link2, Trash2 } from 'lucide-react';
import EditorDialog from './EditorDialog';
import { sanitizeMdxUrl } from '@/lib/v34/mdx-security';

interface LinkDialogProps {
  open: boolean;
  onClose: () => void;
  initialText: string;
  initialUrl?: string;
  isExistingLink: boolean;
  onSubmit: (url: string, text: string) => void;
  onRemove: () => void;
}

/**
 * Outlined text fields and one filled primary action, per M3. The editor
 * selection is restored by the caller before the link is written, so opening
 * the dialog cannot silently move the insertion point.
 */
export default function LinkDialog({
  open,
  onClose,
  initialText,
  initialUrl = '',
  isExistingLink,
  onSubmit,
  onRemove,
}: LinkDialogProps) {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setUrl(initialUrl);
    setText(initialText);
    setError('');
  }, [initialText, initialUrl, open]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const safe = sanitizeMdxUrl(url);
    if (!safe) {
      setError('Use an https://, http://, mailto:, / or # link. Script URLs are blocked.');
      return;
    }
    onSubmit(safe, text.trim() || safe);
  }

  return (
    <EditorDialog open={open} onClose={onClose} labelledBy="link-dialog-title" className="sm:max-w-lg">
      <form onSubmit={submit}>
        <header className="flex items-start gap-3 border-b border-line px-5 pb-4 pt-5">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Link2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="link-dialog-title" className="font-serif text-xl font-semibold tracking-tight text-ink">
              {isExistingLink ? 'Edit link' : 'Insert link'}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
              Links keep their accessible text. Only web, mail, and in-site destinations are accepted.
            </p>
          </div>
        </header>

        <div className="space-y-4 px-5 py-5">
          <div>
            <label htmlFor="editor-link-url" className="block text-sm font-semibold text-ink">
              Destination URL
            </label>
            <input
              id="editor-link-url"
              data-autofocus
              type="text"
              inputMode="url"
              autoComplete="url"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                setError('');
              }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'editor-link-error' : undefined}
              placeholder="https://example.org/paper"
              className="mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-secondary focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            />
            {error ? (
              <p id="editor-link-error" role="alert" className="mt-1 text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="editor-link-text" className="block text-sm font-semibold text-ink">
              Link text <span className="font-normal text-ink-secondary">(optional)</span>
            </label>
            <input
              id="editor-link-text"
              type="text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Read the source"
              className="mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-secondary focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            />
            <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
              Leave blank to use the selected text, or the URL when nothing is selected.
            </p>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3">
          {isExistingLink ? (
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-destructive hover:bg-destructive/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Remove link
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-ink-secondary hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-on-primary hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {isExistingLink ? 'Update link' : 'Insert link'}
            </button>
          </div>
        </footer>
      </form>
    </EditorDialog>
  );
}
