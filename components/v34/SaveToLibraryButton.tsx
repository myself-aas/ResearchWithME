'use client';

import { useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';

interface SaveToLibraryButtonProps {
  itemType: 'contribution' | 'article' | 'source' | 'evidence' | 'claim' | 'tool';
  itemId: string;
  title: string;
  url: string;
  collection?: string;
  initialSaved?: boolean;
}

export default function SaveToLibraryButton({
  itemType,
  itemId,
  title,
  url,
  collection = 'Reading List',
  initialSaved = false,
}: SaveToLibraryButtonProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  async function handleToggle() {
    if (busy) return;
    setBusy(true);
    try {
      if (saved) {
        const res = await fetch(
          `/api/library?itemType=${encodeURIComponent(itemType)}&itemId=${encodeURIComponent(itemId)}`,
          { method: 'DELETE' },
        );
        if (res.ok) setSaved(false);
      } else {
        const res = await fetch('/api/library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemType, itemId, title, url, collection }),
        });
        if (res.ok) setSaved(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={busy}
      aria-pressed={saved}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 py-2 font-sans text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
        saved
          ? 'border-brand bg-brand/10 text-brand'
          : 'border-line bg-canvas text-ink-secondary hover:bg-surface-subtle hover:text-ink'
      }`}
    >
      {saved ? (
        <BookmarkCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
      ) : (
        <Bookmark className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      <span>{saved ? 'Saved in Library' : 'Save'}</span>
    </button>
  );
}
