'use client';

import { useEffect, useState } from 'react';
import { Bookmark, Check, Copy, Link2, Printer, Share2 } from 'lucide-react';
import { readStringArray, writeLocal } from '@/lib/storage';

type StorageKey = 'rwm_saved_posts' | 'rwm_saved_papers';

interface ReadingActionsProps {
  itemId: string;
  storageKey: StorageKey;
  title: string;
  doi?: string;
  shareUrl?: string;
  showPrint?: boolean;
  compact?: boolean;
}

export default function ReadingActions({
  itemId,
  storageKey,
  title,
  doi,
  shareUrl,
  showPrint = false,
  compact = false,
}: ReadingActionsProps) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [shareUrlState, setShareUrlState] = useState(shareUrl ?? '');

  useEffect(() => {
    setSaved(readStringArray(storageKey).includes(itemId));
    if (!shareUrl && typeof window !== 'undefined') {
      setShareUrlState(window.location.href);
    }
  }, [itemId, shareUrl, storageKey]);

  function toggleSaved() {
    const current = readStringArray(storageKey);
    const next = current.includes(itemId)
      ? current.filter((id) => id !== itemId)
      : [...current, itemId];
    const stored = writeLocal(storageKey, next);
    setSaved(next.includes(itemId));
    setFeedback(
      stored
        ? next.includes(itemId)
          ? 'Saved to your reading list on this device.'
          : 'Removed from your reading list.'
        : 'Your browser blocked local storage, so the reading list could not be updated.',
    );
  }

  async function copyCitation() {
    const value = doi ? `https://doi.org/${doi}` : shareUrlState;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setFeedback(doi ? 'DOI link copied to clipboard.' : 'Article link copied to clipboard.');
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setFeedback('Clipboard access was blocked. Copy the address from your browser.');
    }
  }

  async function share() {
    const url = shareUrlState || (typeof window !== 'undefined' ? window.location.href : '');
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        setFeedback('Shared.');
        return;
      } catch {
        // A cancelled share sheet is not an error; fall through to the copy fallback.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setFeedback('Link copied. Paste it wherever you want to share the work.');
    } catch {
      setFeedback('Sharing is unavailable in this browser. Copy the address from your browser.');
    }
  }

  const buttonClass = compact
    ? 'inline-flex h-11 w-11 items-center justify-center rounded-md border border-stone-300 bg-white text-stone-700 transition-colors hover:border-stone-400'
    : 'inline-flex min-h-11 items-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 transition-colors hover:border-stone-400';

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={toggleSaved} aria-pressed={saved} className={buttonClass}>
          <Bookmark className={`h-4 w-4 ${saved ? 'fill-brand text-brand' : ''}`} aria-hidden="true" />
          {!compact && <span>{saved ? 'Saved' : 'Save'}</span>}
          <span className="sr-only">{saved ? 'Remove from reading list' : 'Save to reading list'}</span>
        </button>

        <button type="button" onClick={copyCitation} className={buttonClass}>
          {copied ? <Check className="h-4 w-4 text-emerald-700" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {!compact && <span>{copied ? (doi ? 'DOI copied' : 'Link copied') : doi ? 'Copy DOI' : 'Copy link'}</span>}
          {compact && <span className="sr-only">{doi ? 'Copy DOI link' : 'Copy link'}</span>}
        </button>

        <button type="button" onClick={share} className={buttonClass}>
          <Share2 className="h-4 w-4" aria-hidden="true" />
          {!compact && <span>Share</span>}
          <span className="sr-only">Share {title}</span>
        </button>

        {showPrint && (
          <button
            type="button"
            onClick={() => window.print()}
            className={buttonClass}
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            {!compact && <span>Print or save PDF</span>}
            <span className="sr-only">Print or save this paper as PDF</span>
          </button>
        )}

        {doi && (
          <a
            href={`https://doi.org/${doi}`}
            target="_blank"
            rel="noreferrer noopener"
            className={compact ? buttonClass : 'inline-flex min-h-11 items-center gap-2 px-2 text-sm font-medium text-brand underline underline-offset-4 hover:text-brand-pressed'}
          >
            <Link2 className="h-4 w-4" aria-hidden="true" />
            {!compact && <span>Resolve DOI</span>}
            <span className="sr-only">Resolve DOI at doi.org</span>
          </a>
        )}
      </div>

      <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm text-stone-600">
        {feedback}
      </p>
    </div>
  );
}
