'use client';

import { useState } from 'react';
import { Check, Copy, Quote } from 'lucide-react';

type CiteFormat = 'plain' | 'bibtex' | 'markdown';

export interface CiteBoxProps {
  citation: string;
  bibtex?: string;
  markdown?: string;
}

const FORMATS: { id: CiteFormat; label: string }[] = [
  { id: 'plain', label: 'Plain' },
  { id: 'bibtex', label: 'BibTeX' },
  { id: 'markdown', label: 'Markdown' },
];

/** Suggested citation with format switcher and one-click copy. */
export default function CiteBox({ citation, bibtex, markdown }: CiteBoxProps) {
  const [format, setFormat] = useState<CiteFormat>('plain');
  const [copied, setCopied] = useState(false);

  const available = FORMATS.filter(
    (f) => f.id === 'plain' || (f.id === 'bibtex' && bibtex) || (f.id === 'markdown' && markdown),
  );

  const activeText =
    format === 'bibtex' && bibtex
      ? bibtex
      : format === 'markdown' && markdown
        ? markdown
        : citation;

  async function copy() {
    try {
      await navigator.clipboard.writeText(activeText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard denial: the text stays selectable.
    }
  }

  return (
    <section aria-labelledby="cite-heading" className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="cite-heading"
          className="flex items-center gap-2 font-mono text-[0.6875rem] font-semibold uppercase tracking-wider text-ink"
        >
          <Quote className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
          Cite this essay
        </h2>
        {available.length > 1 && (
          <div role="group" aria-label="Citation format" className="inline-flex rounded-lg border border-line bg-canvas p-0.5">
            {available.map((item) => {
              const active = format === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setFormat(item.id);
                    setCopied(false);
                  }}
                  className={`rounded-md px-2 py-0.5 font-mono text-[0.625rem] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus ${
                    active ? 'bg-surface text-ink shadow-xs' : 'text-ink-secondary hover:text-ink'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <p className="mt-3 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-ink-secondary">
        {activeText}
      </p>

      <button
        type="button"
        onClick={copy}
        className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-canvas px-3 py-1.5 font-sans text-xs font-semibold text-ink transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
        <span aria-live="polite">{copied ? 'Copied' : `Copy ${format === 'plain' ? 'citation' : format}`}</span>
      </button>
    </section>
  );
}
