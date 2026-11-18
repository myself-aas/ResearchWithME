'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import * as Popover from '@radix-ui/react-popover';
import { Check, CheckCircle2, Copy, ExternalLink, GitBranch, GraduationCap } from 'lucide-react';
import type { Author } from '@/lib/blog-data';
import { Text } from '@/components/primitives';

export interface SpecialistBadgePopoverProps {
  author: Pick<
    Author,
    'id' | 'name' | 'role' | 'institution' | 'orcid' | 'github' | 'verifiedVia' | 'verifiedIdentifier'
  >;
}

export default function SpecialistBadgePopover({ author }: SpecialistBadgePopoverProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  if (!author.verifiedVia && !author.orcid && !author.github) {
    return null;
  }

  const viaOrcid = author.verifiedVia === 'orcid' || Boolean(author.orcid && !author.verifiedVia);
  const cleanOrcid = author.orcid?.replace(/^https?:\/\/orcid\.org\//i, '').trim();
  const badgeLabel = author.verifiedVia === 'orcid'
    ? 'ORCID Verified'
    : author.verifiedVia === 'github'
      ? 'GitHub Verified'
      : viaOrcid
        ? 'ORCID Linked'
        : 'GitHub Linked';

  const identifierText =
    cleanOrcid ||
    author.verifiedIdentifier ||
    author.github?.replace(/^https?:\/\/(www\.)?github\.com\//i, '@') ||
    author.id;

  const registryUrl = cleanOrcid
    ? `https://orcid.org/${cleanOrcid}`
    : author.github && /^https?:\/\//i.test(author.github)
      ? author.github
      : undefined;

  function scheduleClose() {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 150);
  }

  function cancelClose() {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  async function handleCopyId() {
    try {
      await navigator.clipboard.writeText(identifierText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          onPointerEnter={() => {
            cancelClose();
            setOpen(true);
          }}
          onPointerLeave={scheduleClose}
          aria-label={`${author.name} — ${badgeLabel} specialist credentials`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-brand/30 bg-selection/40 px-2.5 py-1 font-mono text-xs font-medium text-brand transition-colors hover:bg-selection focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{badgeLabel}</span>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          collisionPadding={12}
          onPointerEnter={cancelClose}
          onPointerLeave={scheduleClose}
          className="z-50 w-80 max-w-[92vw] rounded-sm border border-line bg-surface-raised p-4 text-left text-ink focus:outline-none"
        >
          <Text as="div" variant="eyebrow" color="brand" weight="semibold" className="flex items-center gap-1.5 border-b border-line pb-2">
            {viaOrcid ? (
              <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{badgeLabel} Specialist</span>
          </Text>

          <div className="mt-2.5 space-y-1">
            <p className="font-serif text-base font-semibold text-ink">{author.name}</p>
            <p className="font-sans text-xs text-ink-secondary">
              {author.role}
              {author.institution ? ` · ${author.institution}` : ''}
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 rounded-sm border border-line bg-canvas px-2.5 py-2 font-mono text-xs text-ink">
            <span className="truncate">{identifierText}</span>
            <button
              type="button"
              onClick={handleCopyId}
              aria-label="Copy specialist identifier"
              className="inline-flex min-h-11 shrink-0 items-center gap-1 text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5 font-sans text-xs">
            <Link
              href={`/author/${author.id}`}
              className="font-medium text-ink underline-offset-4 hover:text-brand hover:underline"
            >
              Specialist dossier →
            </Link>
            {registryUrl && (
              <a
                href={registryUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 font-medium text-brand underline-offset-4 hover:underline"
              >
                <span>Registry</span>
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
