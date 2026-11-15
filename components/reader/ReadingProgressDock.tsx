'use client';

import { AnimatePresence, useTransform } from 'motion/react';
import * as m from 'motion/react-m';
import { ArrowUp, Bookmark, MessageSquare } from 'lucide-react';
import type { CitationSource } from '@/lib/citations';
import { useScrollProgress } from '@/lib/motion/hooks';
import { EASING } from '@/lib/motion/tokens';
import Pressable from '@/components/motion/Pressable';
import SuccessCheck from '@/components/motion/SuccessCheck';
import { useHydratePreferences, usePreferencesStore } from '@/lib/stores/preferences-store';
import InlineCitationPopover from './InlineCitationPopover';

export interface ReadingProgressDockProps {
  itemId: string;
  itemKind: 'post' | 'paper';
  readTime: string;
  citationSource: CitationSource;
  citeHref: string;
  discussionAnchor?: string;
  inline?: boolean;
}

function parseMinutes(readTime: string): number {
  const parsed = Number.parseInt(readTime, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 8;
}

export default function ReadingProgressDock({
  itemId,
  itemKind,
  readTime,
  citationSource,
  citeHref,
  discussionAnchor,
  inline = false,
}: ReadingProgressDockProps) {
  const hydrated = useHydratePreferences();
  const savedPostIds = usePreferencesStore((state) => state.savedPostIds);
  const savedPaperIds = usePreferencesStore((state) => state.savedPaperIds);
  const toggleSavedPost = usePreferencesStore((state) => state.toggleSavedPost);
  const toggleSavedPaper = usePreferencesStore((state) => state.toggleSavedPaper);

  // The indicator and the remaining-time copy share one spring-smoothed
  // MotionValue, so the ring and the percentage can never disagree.
  const { smooth, percent: progress } = useScrollProgress();
  const RADIUS = 8;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const ringOffset = useTransform(smooth, (value) => CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, value))));

  const totalMins = parseMinutes(readTime);
  const remainingMins = Math.max(1, Math.ceil(totalMins * (1 - progress / 100)));
  const isSaved = hydrated
    ? itemKind === 'post'
      ? savedPostIds.includes(itemId)
      : savedPaperIds.includes(itemId)
    : false;

  function handleToggleSave() {
    if (itemKind === 'post') {
      toggleSavedPost(itemId);
    } else {
      toggleSavedPaper(itemId);
    }
  }

  function scrollToTop() {
    const reduced = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }

  return (
    <aside
      aria-label="Reading controls"
      className={inline ? "mt-8 reading-column print:hidden" : "fixed bottom-5 left-1/2 z-40 -translate-x-1/2 print:hidden"}
    >
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-1.5 text-ink">
        {/* Solid drawing: the ring is the same object as the top bar, at a
            smaller scale — it reads progress without adding a second metric. */}
        <m.svg
          viewBox="0 0 20 20"
          className="h-5 w-5 -rotate-90 text-brand"
          aria-hidden="true"
          role="presentation"
        >
          <circle cx="10" cy="10" r={RADIUS} fill="none" stroke="currentColor" strokeOpacity="0.16" strokeWidth="2" />
          <m.circle
            cx="10"
            cy="10"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            style={{ strokeDashoffset: ringOffset }}
          />
        </m.svg>

        <span className="font-mono text-xs tabular-nums text-ink-secondary">
          {Math.round(progress)}% · {progress >= 96 ? 'Done' : `${remainingMins}m left`}
        </span>

        <span aria-hidden="true" className="h-4 w-px bg-line" />

        <InlineCitationPopover label="Cite" source={citationSource} citeHref={citeHref} />

        <Pressable
          type="button"
          onClick={handleToggleSave}
          aria-pressed={isSaved}
          aria-label={isSaved ? 'Remove from reading list' : 'Save to reading list'}
          className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${
            isSaved
              ? 'border-brand bg-brand text-on-primary'
              : 'border-transparent text-ink-secondary hover:border-line hover:text-ink'
          }`}
        >
          <AnimatePresence initial={false} mode="wait">
            <m.span
              key={isSaved ? 'saved' : 'unsaved'}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ duration: 0.16, ease: [...EASING.enter] }}
              className="inline-flex"
            >
              {isSaved ? <SuccessCheck size={14} quiet /> : <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />}
            </m.span>
          </AnimatePresence>
        </Pressable>

        {discussionAnchor && (
          <m.a
            href={discussionAnchor}
            aria-label="Jump to peer discussion"
            whileTap={{ scale: 0.94 }}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-transparent text-ink-secondary transition-colors hover:border-line hover:text-ink"
          >
            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
          </m.a>
        )}

        <Pressable
          type="button"
          onClick={scrollToTop}
          aria-label="Scroll to top of manuscript"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-transparent text-ink-secondary transition-colors hover:border-line hover:text-ink"
        >
          <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
        </Pressable>
      </div>
    </aside>
  );
}
