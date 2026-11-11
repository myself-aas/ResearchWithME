'use client';

import { useState } from 'react';
import Link from 'next/link';
import * as Popover from '@radix-ui/react-popover';
import { Check, Copy, ExternalLink, Quote, X } from 'lucide-react';
import { buildCitation, type CitationSource } from '@/lib/citations';
import { t } from '@/lib/i18n';
import { useLocale } from '@/components/i18n/LocaleProvider';

export interface InlineCitationPopoverProps {
  label: string;
  source: CitationSource;
  citeHref?: string;
}

type CopiedKind = 'bibtex' | 'apa' | 'doi' | null;

function resolveDoiString(source: CitationSource): string {
  const raw = (source.doi ?? '').trim();
  if (!raw) return source.url ?? '';
  const cleaned = raw.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '');
  if (/^10\./.test(cleaned)) return `https://doi.org/${cleaned}`;
  return raw;
}

export default function InlineCitationPopover({
  label,
  source,
  citeHref,
}: InlineCitationPopoverProps) {
  const { locale } = useLocale();
  const [copied, setCopied] = useState<CopiedKind>(null);

  async function copyText(kind: Exclude<CopiedKind, null>, value: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied((prev) => (prev === kind ? null : prev)), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  const doiTarget = resolveDoiString(source);
  const externalUrl = /^https?:\/\//i.test(doiTarget)
    ? doiTarget
    : source.url && /^https?:\/\//i.test(source.url)
      ? source.url
      : null;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`Citation ${label}: ${source.title}`}
          className="inline-flex items-baseline rounded-xs px-1 py-0.5 font-mono text-xs font-medium text-brand underline decoration-brand/40 underline-offset-4 transition-colors hover:bg-selection"
        >
          {label}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          collisionPadding={12}
          className="z-50 w-80 max-w-[92vw] rounded-sm border border-line bg-surface-raised p-4 text-left text-ink focus:outline-none"
        >
          <div className="flex items-start justify-between gap-2 border-b border-line pb-2.5">
            <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-brand">
              <Quote className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t(locale, 'reader.cite')}</span>
            </span>
            <Popover.Close asChild>
              <button
                type="button"
                aria-label="Close citation popover"
                className="inline-flex h-6 w-6 items-center justify-center rounded-xs text-ink-secondary hover:bg-surface-subtle hover:text-ink"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </Popover.Close>
          </div>

          <div className="mt-2.5 space-y-1">
            <p className="font-serif text-sm font-semibold leading-snug text-ink">{source.title}</p>
            <p className="font-sans text-xs text-ink-secondary">
              {source.author} · {source.journal} ({source.year})
            </p>
            {source.doi && (
              <p className="break-all font-mono text-xs text-ink">{source.doi}</p>
            )}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5 border-t border-line pt-3">
            <button
              type="button"
              onClick={() => copyText('bibtex', buildCitation('bibtex', source))}
              className="inline-flex min-h-9 items-center justify-center gap-1 rounded-sm border border-line bg-canvas px-2 py-1 font-mono text-xs font-medium text-ink transition-colors hover:border-brand hover:text-brand"
            >
              {copied === 'bibtex' ? (
                <Check className="h-3 w-3 text-brand" aria-hidden="true" />
              ) : (
                <Copy className="h-3 w-3" aria-hidden="true" />
              )}
              <span>{copied === 'bibtex' ? 'Copied' : 'BibTeX'}</span>
            </button>

            <button
              type="button"
              onClick={() => copyText('apa', buildCitation('apa', source))}
              className="inline-flex min-h-9 items-center justify-center gap-1 rounded-sm border border-line bg-canvas px-2 py-1 font-mono text-xs font-medium text-ink transition-colors hover:border-brand hover:text-brand"
            >
              {copied === 'apa' ? (
                <Check className="h-3 w-3 text-brand" aria-hidden="true" />
              ) : (
                <Copy className="h-3 w-3" aria-hidden="true" />
              )}
              <span>{copied === 'apa' ? 'Copied' : 'APA'}</span>
            </button>

            <button
              type="button"
              onClick={() => copyText('doi', doiTarget)}
              className="inline-flex min-h-9 items-center justify-center gap-1 rounded-sm border border-line bg-canvas px-2 py-1 font-mono text-xs font-medium text-ink transition-colors hover:border-brand hover:text-brand"
            >
              {copied === 'doi' ? (
                <Check className="h-3 w-3 text-brand" aria-hidden="true" />
              ) : (
                <Copy className="h-3 w-3" aria-hidden="true" />
              )}
              <span>{copied === 'doi' ? 'Copied' : 'DOI'}</span>
            </button>
          </div>

          {(externalUrl || citeHref) && (
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5 font-sans text-xs">
              {externalUrl && (
                <a
                  href={externalUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 font-medium text-brand underline-offset-4 hover:underline"
                >
                  <span>Primary record</span>
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              )}
              {citeHref && (
                <Link
                  href={citeHref}
                  className="font-medium text-ink-secondary underline-offset-4 hover:text-ink hover:underline"
                >
                  All formats →
                </Link>
              )}
            </div>
          )}

          <span role="status" aria-live="polite" className="sr-only">
            {copied ? t(locale, 'reader.copied') : ''}
          </span>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
