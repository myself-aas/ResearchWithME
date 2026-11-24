'use client';

import { useState } from 'react';
import { Check, Copy, Quote } from 'lucide-react';

/** Suggested citation with a one-click copy. */
export default function CiteBox({ citation }: { citation: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(citation);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard denial: the text stays selectable.
    }
  }

  return (
    <section aria-labelledby="cite-heading" className="rounded-2xl border border-line bg-surface p-5">
      <h2
        id="cite-heading"
        className="flex items-center gap-2 font-mono text-[0.6875rem] font-semibold uppercase tracking-wider text-ink"
      >
        <Quote className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
        Cite this essay
      </h2>
      <p className="mt-3 font-mono text-xs leading-relaxed text-ink-secondary">{citation}</p>
      <button
        type="button"
        onClick={copy}
        className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-canvas px-3 py-1.5 font-sans text-xs font-semibold text-ink transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
        <span aria-live="polite">{copied ? 'Copied' : 'Copy citation'}</span>
      </button>
    </section>
  );
}
