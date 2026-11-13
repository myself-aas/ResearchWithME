'use client';

import { useState } from 'react';
import Link from 'next/link';
import * as Popover from '@radix-ui/react-popover';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { Copy, ExternalLink, Quote, X } from 'lucide-react';
import { buildCitation, type CitationSource } from '@/lib/citations';
import { EASING } from '@/lib/motion/tokens';
import SuccessCheck from '@/components/motion/SuccessCheck';
import { Text } from '@/components/primitives';

export interface InlineCitationPopoverProps {
  label: string;
  source: CitationSource;
  citeHref?: string;
}


function resolveDoiString(source: CitationSource): string {
  const raw = (source.doi ?? '').trim();
  if (!raw) return source.url ?? '';
  const cleaned = raw.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '');
  if (/^10\./.test(cleaned)) return `https://doi.org/${cleaned}`;
  return raw;
}


type CopiedKind = 'bibtex' | 'apa' | 'doi' | null;

const COPY_FORMATS: Array<{ kind: Exclude<CopiedKind, null> }> = [
  { kind: 'bibtex' },
  { kind: 'apa' },
  { kind: 'doi' },
];

/**
 * CopyChip — secondary action (principle 8): the icon draws into a tick while
 * the label flips to "Copied". The live region above announces it once.
 */
function CopyChip({ label, copied, onCopy }: { label: string; copied: boolean; onCopy: () => void }) {
  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex min-h-9 items-center justify-center gap-1 rounded-sm border border-line bg-canvas px-2 py-1 font-mono text-xs font-medium text-ink transition-colors hover:border-brand hover:text-brand"
    >
      <AnimatePresence initial={false} mode="wait">
        <m.span
          key={copied ? 'copied' : 'copy'}
          initial={{ scale: 0.6, opacity: 0, rotate: -12 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.6, opacity: 0, rotate: 12 }}
          transition={{ duration: 0.16, ease: [...EASING.emphasize] }}
          className="inline-flex text-brand"
          aria-hidden="true"
        >
          {copied ? <SuccessCheck size={12} /> : <Copy className="h-3 w-3" />}
        </m.span>
      </AnimatePresence>
      <span>{copied ? 'Copied' : label}</span>
    </button>
  );
}

export default function InlineCitationPopover({
  label,
  source,
  citeHref,
}: InlineCitationPopoverProps) {
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
          asChild
        >
          <m.div
            className="z-50 w-80 max-w-[92vw] rounded-sm border border-line bg-surface-raised p-4 text-left text-ink focus:outline-none"
            initial={{ opacity: 0, y: -6, scale: 0.98, rotate: -0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            transition={{ duration: 0.18, ease: [...EASING.emphasize] }}
          >
          <div className="flex items-start justify-between gap-2 border-b border-line pb-2.5">
            <Text as="span" variant="eyebrow" color="brand" weight="semibold" className="inline-flex items-center gap-1.5">
              <Quote className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Cite reference</span>
            </Text>
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
            {COPY_FORMATS.map((format) => (
              <CopyChip
                key={format.kind}
                label={format.kind === 'doi' ? 'DOI' : format.kind.toUpperCase()}
                copied={copied === format.kind}
                onCopy={() => copyText(format.kind, format.kind === 'doi' ? doiTarget : buildCitation(format.kind, source))}
              />
            ))}
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
            {copied ? 'Copied to clipboard' : ''}
          </span>
          </m.div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
