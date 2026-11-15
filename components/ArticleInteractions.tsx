'use client';

import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { Bookmark, Copy, Heart, Share2 } from 'lucide-react';
import { useHydratePreferences, usePreferencesStore } from '@/lib/stores/preferences-store';
import { EASING } from '@/lib/motion/tokens';
import Pressable from './motion/Pressable';
import SuccessCheck from './motion/SuccessCheck';

interface ArticleInteractionsProps {
  postId: string;
  title: string;
  initialLikes: number;
}

export default function ArticleInteractions({
  postId,
  title,
  initialLikes,
}: ArticleInteractionsProps) {
  const hydrated = useHydratePreferences();
  const savedPostIds = usePreferencesStore((state) => state.savedPostIds);
  const likedPostIds = usePreferencesStore((state) => state.likedPostIds);
  const toggleSavedPost = usePreferencesStore((state) => state.toggleSavedPost);
  const setPostLiked = usePreferencesStore((state) => state.setPostLiked);

  const [likes, setLikes] = useState(initialLikes);
  const [status, setStatus] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const saved = hydrated ? savedPostIds.includes(postId) : false;
  const liked = hydrated ? likedPostIds.includes(postId) : false;

  async function like() {
    if (liked) {
      setStatus('You have already added a like to this article.');
      return;
    }
    setPostLiked(postId, true);
    setLikes((value) => value + 1);

    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(postId)}`, { method: 'PATCH' });
      if (!res.ok) throw new Error('not recorded');
      const data: { likes?: number } = await res.json();
      if (typeof data.likes === 'number' && data.likes > 0) setLikes(data.likes);
    } catch {
      setPostLiked(postId, false);
      setLikes((value) => Math.max(0, value - 1));
      setStatus('The like could not be recorded. Check your connection and try again.');
    }
  }

  function toggleSaved() {
    const nowSaved = !saved;
    const ok = toggleSavedPost(postId);
    setStatus(
      ok
        ? nowSaved
          ? 'Saved to your reading list on this device.'
          : 'Removed from your reading list.'
        : 'Your browser blocked local storage, so the reading list was updated for this session only.',
    );
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setStatus('Article link copied to clipboard.');
      window.setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      setStatus('Clipboard access was blocked. Copy the address from your browser.');
    }
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        setStatus('Shared.');
        return;
      } catch {
        /* cancelled */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setStatus('Link copied. Paste it wherever you want to share the article.');
    } catch {
      setStatus('Sharing is unavailable in this browser. Copy the address from the browser bar.');
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Pressable
          type="button"
          onClick={like}
          aria-pressed={liked}
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-sm border px-3 py-2 font-mono text-xs font-medium transition-colors ${
            liked
              ? 'border-brand bg-selection text-brand'
              : 'border-line bg-surface text-ink hover:bg-surface-subtle'
          }`}
        >
          {/* Secondary action (principle 8): the heart pops, the number does
              not count up — reme §9 keeps numeric animation out of the UI. */}
          <m.span
            aria-hidden="true"
            className="inline-flex"
            animate={liked ? { scale: [1, 1.35, 1], rotate: [0, -10, 0] } : { scale: 1, rotate: 0 }}
            transition={{ duration: 0.4, times: [0, 0.45, 1], ease: [...EASING.emphasize] }}
          >
            <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-current' : ''}`} />
          </m.span>
          <span>{likes}</span>
          <span className="sr-only">likes. {liked ? 'You liked this article' : 'Add a like'}</span>
        </Pressable>

        <Pressable
          type="button"
          onClick={toggleSaved}
          aria-pressed={saved}
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-sm border px-3 py-2 font-sans text-xs font-medium transition-colors ${
            saved
              ? 'border-brand bg-brand text-on-primary'
              : 'border-line bg-surface text-ink hover:bg-surface-subtle'
          }`}
        >
          <AnimatePresence initial={false} mode="wait">
            <m.span
              key={saved ? 'saved' : 'unsaved'}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ duration: 0.16, ease: [...EASING.enter] }}
              className="inline-flex"
            >
              {saved ? <SuccessCheck size={14} quiet /> : <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />}
            </m.span>
          </AnimatePresence>
          <span>{saved ? 'Saved' : 'Save'}</span>
        </Pressable>

        <Pressable
          type="button"
          onClick={share}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 font-sans text-xs font-medium text-ink transition-colors hover:bg-surface-subtle"
        >
          <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Share</span>
        </Pressable>

        <Pressable
          type="button"
          onClick={copyLink}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 font-sans text-xs font-medium text-ink transition-colors hover:bg-surface-subtle"
        >
          <AnimatePresence initial={false} mode="wait">
            <m.span
              key={copiedLink ? 'copied' : 'idle'}
              initial={{ scale: 0.7, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.7, opacity: 0, rotate: 10 }}
              transition={{ duration: 0.16, ease: [...EASING.emphasize] }}
              className="inline-flex text-brand"
            >
              {copiedLink ? <SuccessCheck size={14} /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
            </m.span>
          </AnimatePresence>
          <span>{copiedLink ? 'Copied' : 'Copy link'}</span>
        </Pressable>
      </div>

      <p role="status" aria-live="polite" className="mt-2 min-h-5 font-sans text-xs text-ink-secondary">
        <AnimatePresence initial={false} mode="wait">
          {status ? (
            <m.span
              key={status}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [...EASING.standard] }}
              className="inline-block"
            >
              {status}
            </m.span>
          ) : null}
        </AnimatePresence>
      </p>
    </div>
  );
}
