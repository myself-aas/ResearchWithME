'use client';

import { useState } from 'react';
import { Film } from 'lucide-react';

interface VideoEmbedProps {
  src: string;
  label: string;
  poster?: string;
  captionsSrc?: string;
  /** aspect ratio class — defaults to 16/9 */
  aspectClass?: string;
  /** true = loop silently (ambient); false = controls, muted autoplay (explainer) */
  ambient?: boolean;
}

export default function VideoEmbed({
  src,
  label,
  poster = '/images/folio-hero.jpeg',
  captionsSrc,
  aspectClass = 'aspect-video',
  ambient = false,
}: VideoEmbedProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className={`${aspectClass} flex flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-line bg-surface text-sm text-ink-secondary`}>
        <Film className="h-8 w-8 text-ink-secondary" aria-hidden="true" />
        <span className="font-medium text-ink">Render pending</span>
        <code className="rounded-xs bg-canvas px-2 py-0.5 font-mono text-xs text-ink-secondary">{src}</code>
      </div>
    );
  }

  if (ambient) {
    return (
      <video
        src={src}
        poster={poster}
        aria-label={label}
        autoPlay
        muted
        loop
        playsInline
        disablePictureInPicture
        className="h-full w-full object-cover"
        onError={() => setError(true)}
      >
        {captionsSrc && (
          <track kind="captions" src={captionsSrc} srcLang="en" label="English captions" default />
        )}
      </video>
    );
  }

  return (
    <video
      src={src}
      poster={poster}
      aria-label={label}
      autoPlay
      muted
      playsInline
      controls
      className={`w-full rounded-sm bg-ink ${aspectClass}`}
      onError={() => setError(true)}
    >
      {captionsSrc && (
        <track kind="captions" src={captionsSrc} srcLang="en" label="English captions" default />
      )}
      <p className="sr-only">Your browser does not support HTML video.</p>
    </video>
  );
}
