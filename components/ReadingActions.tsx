'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { Bookmark, Copy, Link2, Printer, Share2 } from 'lucide-react';
import { useHydratePreferences, usePreferencesStore } from '@/lib/stores/preferences-store';
import { EASING } from '@/lib/motion/tokens';
import Pressable from './motion/Pressable';
import SuccessCheck from './motion/SuccessCheck';

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
  const hydrated = useHydratePreferences();
  const savedPostIds = usePreferencesStore((state) => state.savedPostIds);
  const savedPaperIds = usePreferencesStore((state) => state.savedPaperIds);
  const toggleSavedPost = usePreferencesStore((state) => state.toggleSavedPost);
  const toggleSavedPaper = usePreferencesStore((state) => state.toggleSavedPaper);

  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [shareUrlState, setShareUrlState] = useState(shareUrl ?? '');

  useEffect(() => {
    if (!shareUrl && typeof window !== 'undefined') {
      setShareUrlState(window.location.href);
    }
  }, [shareUrl]);

  const saved = hydrated
    ? storageKey === 'rwm_saved_posts'
      ? savedPostIds.includes(itemId)
      : savedPaperIds.includes(itemId)
    : false;

  function toggleSaved() {
    const ok =
      storageKey === 'rwm_saved_posts'
        ? toggleSavedPost(itemId)
        : toggleSavedPaper(itemId);
    const nowSaved = !saved;
    setFeedback(
      ok
        ? nowSaved
          ? 'Saved to your reading list on this device.'
          : 'Removed from your reading list.'
        : 'Your browser blocked local storage, so the reading list was updated for this session only.',
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
        /* cancelled */
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
    ? 'inline-flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink'
    : 'inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 font-sans text-xs font-medium text-ink transition-colors hover:bg-surface-subtle';

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Pressable
          type="button"
          onClick={toggleSaved}
          aria-pressed={saved}
          className={
            saved
              ? compact
                ? 'inline-flex h-11 w-11 items-center justify-center rounded-xl border border-brand bg-brand text-on-primary transition-colors'
                : 'inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand bg-brand px-4 py-2 font-sans text-xs font-medium text-on-primary transition-colors'
              : buttonClass
          }
        >
          <AnimatePresence initial={false} mode="wait">
            <m.span
              key={saved ? 'saved' : 'unsaved'}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ duration: 0.16, ease: [...EASING.enter] }}
              className="inline-flex"
              aria-hidden="true"
            >
              {saved ? <SuccessCheck size={16} quiet /> : <Bookmark className="h-4 w-4" />}
            </m.span>
          </AnimatePresence>
          {!compact && <span>{saved ? 'Saved' : 'Save'}</span>}
          <span className="sr-only">{saved ? 'Remove from reading list' : 'Save to reading list'}</span>
        </Pressable>

        <Pressable type="button" onClick={copyCitation} className={buttonClass}>
          <AnimatePresence initial={false} mode="wait">
            <m.span
              key={copied ? 'copied' : 'idle'}
              initial={{ scale: 0.7, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.7, opacity: 0, rotate: 10 }}
              transition={{ duration: 0.16, ease: [...EASING.emphasize] }}
              className="inline-flex text-brand"
              aria-hidden="true"
            >
              {copied ? <SuccessCheck size={16} /> : <Copy className="h-4 w-4" />}
            </m.span>
          </AnimatePresence>
          {!compact && <span>{copied ? (doi ? 'DOI copied' : 'Link copied') : doi ? 'Copy DOI' : 'Copy link'}</span>}
          {compact && <span className="sr-only">{doi ? 'Copy DOI link' : 'Copy link'}</span>}
        </Pressable>

        <Pressable type="button" onClick={share} className={buttonClass}>
          <Share2 className="h-4 w-4" aria-hidden="true" />
          {!compact && <span>Share</span>}
          <span className="sr-only">Share {title}</span>
        </Pressable>

        {showPrint && (
          <Pressable type="button" onClick={() => window.print()} className={buttonClass}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            {!compact && <span>Print or save PDF</span>}
            <span className="sr-only">Print or save this paper as PDF</span>
          </Pressable>
        )}

        {doi && (
          <a
            href={`https://doi.org/${doi}`}
            target="_blank"
            rel="noreferrer noopener"
            className={
              compact
                ? buttonClass
                : 'inline-flex min-h-11 items-center gap-1.5 px-2 font-mono text-xs font-medium text-brand underline underline-offset-4 hover:text-brand-pressed'
            }
          >
            <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
            {!compact && <span>Resolve DOI</span>}
            <span className="sr-only">Resolve DOI at doi.org</span>
          </a>
        )}
      </div>

      <p role="status" aria-live="polite" className="mt-2 min-h-5 font-sans text-xs text-ink-secondary">
        <AnimatePresence initial={false} mode="wait">
          {feedback ? (
            <m.span
              key={feedback}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [...EASING.standard] }}
              className="inline-block"
            >
              {feedback}
            </m.span>
          ) : null}
        </AnimatePresence>
      </p>
    </div>
  );
}
