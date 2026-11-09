'use client';

import { useEffect, useState } from 'react';
import { Bookmark, Check, Copy, Heart, Share2 } from 'lucide-react';
import { readStringArray, writeLocal } from '@/lib/storage';

interface ArticleInteractionsProps {
  postId: string;
  title: string;
  initialLikes: number;
}

export default function ArticleInteractions({ postId, title, initialLikes }: ArticleInteractionsProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [copiedDoi, setCopiedDoi] = useState(false);

  useEffect(() => {
    setSaved(readStringArray('rwm_saved_posts').includes(postId));
    setLiked(readStringArray('rwm_liked_posts').includes(postId));
  }, [postId]);

  async function like() {
    if (liked) {
      setStatus('You have already added a like to this article.');
      return;
    }
    setLiked(true);
    setLikes((value) => value + 1);
    writeLocal('rwm_liked_posts', [...readStringArray('rwm_liked_posts'), postId]);

    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(postId)}`, { method: 'PATCH' });
      if (!res.ok) throw new Error('not recorded');
      const data: { likes?: number } = await res.json();
      if (typeof data.likes === 'number' && data.likes > 0) setLikes(data.likes);
    } catch {
      setLiked(false);
      setLikes((value) => Math.max(0, value - 1));
      writeLocal('rwm_liked_posts', readStringArray('rwm_liked_posts').filter((id) => id !== postId));
      setStatus('The like could not be recorded. Check your connection and try again.');
    }
  }

  function toggleSaved() {
    const current = readStringArray('rwm_saved_posts');
    const next = current.includes(postId) ? current.filter((id) => id !== postId) : [...current, postId];
    const stored = writeLocal('rwm_saved_posts', next);
    setSaved(next.includes(postId));
    window.dispatchEvent(new Event('rwm:reading-list-changed'));
    setStatus(
      stored
        ? next.includes(postId)
          ? 'Saved to your reading list on this device.'
          : 'Removed from your reading list.'
        : 'Your browser blocked local storage, so the reading list was not updated.',
    );
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedDoi(true);
      setStatus('Article link copied to clipboard.');
      window.setTimeout(() => setCopiedDoi(false), 2200);
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
        // Fall back to copying when the share sheet is cancelled or unavailable.
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
        <button
          type="button"
          onClick={like}
          aria-pressed={liked}
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
            liked ? 'border-red-200 bg-red-50 text-red-900' : 'border-stone-300 bg-white text-stone-800 hover:border-stone-400'
          }`}
        >
          <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} aria-hidden="true" />
          <span>{likes}</span>
          <span className="sr-only">likes. {liked ? 'You liked this article' : 'Add a like'}</span>
        </button>

        <button
          type="button"
          onClick={toggleSaved}
          aria-pressed={saved}
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
            saved ? 'border-indigo-300 bg-indigo-50 text-brand' : 'border-stone-300 bg-white text-stone-800 hover:border-stone-400'
          }`}
        >
          <Bookmark className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} aria-hidden="true" />
          <span>{saved ? 'Saved' : 'Save'}</span>
        </button>

        <button
          type="button"
          onClick={share}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 transition-colors hover:border-stone-400"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
          <span>Share</span>
        </button>

        <button
          type="button"
          onClick={copyLink}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 transition-colors hover:border-stone-400"
        >
          {copiedDoi ? <Check className="h-4 w-4 text-emerald-700" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          <span>{copiedDoi ? 'Copied' : 'Copy link'}</span>
        </button>
      </div>

      <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm text-stone-600">
        {status}
      </p>
    </div>
  );
}
