'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Author } from '@/lib/blog-data';

interface AuthorAvatarProps {
  author: Author;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showControls?: boolean;
}

export default function AuthorAvatar({
  author,
  size = 'lg',
  showControls = true,
}: AuthorAvatarProps) {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [sourceInfo, setSourceInfo] = useState<string | null>(null);

  const dimensions = {
    sm: 'h-10 w-10 text-xs',
    md: 'h-14 w-14 text-sm',
    lg: 'h-20 w-20 text-xl',
    xl: 'h-28 w-28 text-2xl',
  }[size];

  const generateAvatar = useCallback(async (forceAi = false) => {
    setLoading(true);
    try {
      const res = await fetch('/api/author-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId: author.id,
          name: author.name,
          role: author.role,
          domain: author.domain,
          bio: author.bio,
          forceAi,
        }),
      });

      if (!res.ok) throw new Error('The avatar request failed');
      const data = await res.json();
      if (data.svg) {
        setSvgContent(data.svg);
        setSourceInfo(data.source && data.source.includes('gemini') ? 'Model-drawn' : 'Drawn from domain');
      }
    } catch (err) {
      console.error('Avatar generation failed:', err);
    } finally {
      setLoading(false);
    }
  }, [author]);

  useEffect(() => {
    generateAvatar();
  }, [generateAvatar]);

  return (
    <div className="flex flex-col items-center sm:items-start gap-2">
      <div className={`relative shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-900 shadow-sm ${dimensions}`}>
        {loading ? (
          <div className="flex h-full w-full items-center justify-center bg-stone-900 text-stone-300">
            <RefreshCw className="h-6 w-6 animate-spin text-amber-500" />
          </div>
        ) : svgContent ? (
          <div
            className="h-full w-full"
            dangerouslySetInnerHTML={{ __html: svgContent }}
            aria-label={`Illustrated avatar for ${author.name}`}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center font-serif font-bold text-stone-100">
            {author.avatar}
          </span>
        )}
      </div>

      {showControls && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => generateAvatar(true)}
            disabled={loading}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 transition-colors hover:border-amber-700 hover:text-amber-900 disabled:opacity-50"
            title="Draw a new avatar from this author's field"
          >
            <Sparkles className="h-3 w-3 text-amber-800" />
            <span>{loading ? 'Drawing…' : 'Redraw avatar'}</span>
          </button>
          {sourceInfo && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800" title="Avatar source">
              <CheckCircle2 className="h-3 w-3" />
              <span>{sourceInfo}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
