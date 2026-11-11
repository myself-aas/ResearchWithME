'use client';

import { useEffect, useState } from 'react';
import { ArrowUp, Bookmark, MessageSquare } from 'lucide-react';
import type { CitationSource } from '@/lib/citations';
import { useHydratePreferences, usePreferencesStore } from '@/lib/stores/preferences-store';
import InlineCitationPopover from './InlineCitationPopover';

export interface ReadingProgressDockProps {
  itemId: string;
  itemKind: 'post' | 'paper';
  readTime: string;
  citationSource: CitationSource;
  citeHref: string;
  discussionAnchor?: string;
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
}: ReadingProgressDockProps) {
  const hydrated = useHydratePreferences();
  const savedPostIds = usePreferencesStore((state) => state.savedPostIds);
  const savedPaperIds = usePreferencesStore((state) => state.savedPaperIds);
  const toggleSavedPost = usePreferencesStore((state) => state.toggleSavedPost);
  const toggleSavedPaper = usePreferencesStore((state) => state.toggleSavedPaper);

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    function update() {
      frame = 0;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(total > 0 ? Math.min(100, Math.max(0, (window.scrollY / total) * 100)) : 0);
    }
    function onScroll() {
      if (frame === 0) frame = window.requestAnimationFrame(update);
    }
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

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
      className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 print:hidden"
    >
      <div className="flex items-center gap-2 rounded-sm border border-line bg-surface/95 px-3 py-1.5 text-ink backdrop-blur-xs">
        <span className="font-mono text-xs tabular-nums text-ink-secondary">
          {Math.round(progress)}% · {progress >= 96 ? 'Done' : `${remainingMins}m left`}
        </span>

        <span aria-hidden="true" className="h-4 w-px bg-line" />

        <InlineCitationPopover label="Cite" source={citationSource} citeHref={citeHref} />

        <button
          type="button"
          onClick={handleToggleSave}
          aria-pressed={isSaved}
          aria-label={isSaved ? 'Remove from reading list' : 'Save to reading list'}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-xs border transition-colors ${
            isSaved
              ? 'border-brand bg-brand text-on-primary'
              : 'border-transparent text-ink-secondary hover:border-line hover:text-ink'
          }`}
        >
          <Bookmark className={`h-3.5 w-3.5 ${isSaved ? 'fill-current' : ''}`} aria-hidden="true" />
        </button>

        {discussionAnchor && (
          <a
            href={discussionAnchor}
            aria-label="Jump to peer discussion"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xs border border-transparent text-ink-secondary transition-colors hover:border-line hover:text-ink"
          >
            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        )}

        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Scroll to top of manuscript"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xs border border-transparent text-ink-secondary transition-colors hover:border-line hover:text-ink"
        >
          <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
