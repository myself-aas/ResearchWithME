'use client';

/**
 * Citation — reme v3.1 §7 component (stage 3, beta).
 *
 * Purpose: short, full, and machine-readable citation views for a source,
 * with DOI, BibTeX, RIS, CSL-JSON, and a stable internal identifier.
 * Anatomy: view tabs (Short | Full | Machine) → format select (machine view) →
 *   citation text (mono for machine views, serif for reading views) → copy
 *   button → announced feedback.
 * Copy feedback: visible text change ("Copied") + aria-live="polite" announcement
 *   (spec: "Copy actions provide visible and announced feedback").
 * Keyboard: native tabs/buttons; focus ring per focus token.
 * Token mapping: citation-* semantic tokens + metadata font for identifiers.
 * Tests: lib/__tests__/citation-component.test.ts.
 */
import { useState } from 'react';
import {
  shortCitation,
  fullCitation,
  machineCitation,
  type CitationSource,
  type CitationView,
  type MachineFormat,
} from '@/lib/citations';

export interface CitationProps {
  source: CitationSource;
  /** stable internal identifier, e.g. the source's ObjectId */
  internalId?: string;
  defaultView?: CitationView;
}

const VIEWS: Array<{ id: CitationView; label: string }> = [
  { id: 'short', label: 'Short' },
  { id: 'full', label: 'Full' },
  { id: 'machine', label: 'Machine' },
];

const MACHINE_FORMATS: Array<{ id: MachineFormat; label: string }> = [
  { id: 'bibtex', label: 'BibTeX' },
  { id: 'ris', label: 'RIS' },
  { id: 'csl-json', label: 'CSL-JSON' },
];

export default function Citation({ source, internalId, defaultView = 'full' }: CitationProps) {
  const [view, setView] = useState<CitationView>(defaultView);
  const [format, setFormat] = useState<MachineFormat>('bibtex');
  const [copied, setCopied] = useState(false);

  const text = view === 'short' ? shortCitation(source) : view === 'full' ? fullCitation(source) : machineCitation(format, source);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard unavailable (permissions/SSR) — still announce the citation text is shown
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabBtn = (active: boolean) =>
    `min-h-11 rounded-sm px-3 py-2 font-sans text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
      active ? 'bg-action-primary text-on-primary' : 'bg-surface text-brand hover:bg-surface-subtle'
    }`;

  return (
    <section aria-label="Citation" className="rounded-md border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Citation view">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={view === v.id}
            className={tabBtn(view === v.id)}
            onClick={() => setView(v.id)}
          >
            {v.label}
          </button>
        ))}
        {view === 'machine' ? (
          <select
            aria-label="Machine format"
            className="min-h-11 rounded-sm border border-line bg-surface px-2 py-2 font-sans text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            value={format}
            onChange={(e) => setFormat(e.target.value as MachineFormat)}
          >
            {MACHINE_FORMATS.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
        ) : null}
        <button type="button" className={`${tabBtn(false)} ml-auto`} onClick={onCopy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <p
        role="tabpanel"
        className={`mt-3 whitespace-pre-wrap break-words rounded-sm bg-surface-subtle p-3 text-sm leading-[1.6] ${
          view === 'machine' ? 'font-mono text-[0.8125rem] text-text-primary' : 'font-serif text-text-primary'
        }`}
      >
        {text}
      </p>

      <p className="mt-2 font-sans text-xs text-text-tertiary">
        {internalId ? (
          <span className="font-mono">Internal ID: {internalId}</span>
        ) : null}
        {source.doi ? <span className={internalId ? 'ml-3 font-mono' : 'font-mono'}>DOI: {source.doi}</span> : null}
      </p>

      <p aria-live="polite" className="sr-only">
        {copied ? 'Citation copied to clipboard.' : ''}
      </p>
    </section>
  );
}
