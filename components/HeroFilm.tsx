'use client';

import { useRef, useState } from 'react';
import { Play } from 'lucide-react';

interface HeroFilmProps {
  src: string;
  poster: string;
  label: string;
}

/**
 * Poster-first film player. Nothing downloads and nothing moves until the
 * reader asks for it, so the hero stays cheap and reduced-motion settings are
 * respected without a media query. Sound starts with the click, since the
 * click is the gesture that permits it. The control sits under the frame so
 * nothing is drawn over the film itself.
 */
export default function HeroFilm({ src, poster, label }: HeroFilmProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);

  function start() {
    const video = videoRef.current;
    if (!video) return;
    setStarted(true);
    video.muted = false;
    void video.play().catch(() => {
      // Autoplay with sound can still be refused; fall back to a silent play.
      video.muted = true;
      void video.play().catch(() => setStarted(false));
    });
  }

  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        preload="none"
        playsInline
        controls={started}
        aria-label={label}
        className="aspect-video w-full bg-stone-100 object-cover"
        onError={() => setFailed(true)}
        onPlay={() => setStarted(true)}
      />
      {!started && (
        <div className="flex items-center justify-between gap-3 border-t border-stone-200 px-2 py-2">
          {failed ? (
            <p className="px-1 text-sm text-stone-700">The film is unavailable right now. The page is unaffected.</p>
          ) : (
            <button
              type="button"
              onClick={start}
              className="inline-flex min-h-10 items-center gap-2.5 rounded-md px-2 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-100 focus-visible:bg-stone-100"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-stone-900 text-white">
                <Play className="ml-0.5 h-3.5 w-3.5 fill-current" aria-hidden="true" />
              </span>
              Play the film · 22 s
            </button>
          )}
          {!failed && <span className="pr-2 text-xs uppercase tracking-wide text-stone-500">Captioned</span>}
        </div>
      )}
    </div>
  );
}
