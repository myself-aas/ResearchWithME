'use client';

import { useState } from 'react';
import { Film } from 'lucide-react';

interface VideoEmbedProps {
  src: string;
  label: string;
  /** aspect ratio class — defaults to 16/9 */
  aspectClass?: string;
  /** true = loop silently (ambient); false = controls, muted autoplay (explainer) */
  ambient?: boolean;
}

export default function VideoEmbed({ src, label, aspectClass = 'aspect-video', ambient = false }: VideoEmbedProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
        <Film className="h-4 w-4 shrink-0 text-stone-500" aria-hidden="true" />
        <span>No video for this review yet. The text is complete below.</span>
      </div>
    );
  }

  if (ambient) {
    return (
      <video
        src={src}
        aria-label={label}
        autoPlay
        muted
        loop
        playsInline
        disablePictureInPicture
        className="h-full w-full object-cover"
        onError={() => setError(true)}
      />
    );
  }

  return (
    <video
      src={src}
      aria-label={label}
      autoPlay
      muted
      playsInline
      controls
      className={`w-full rounded-lg bg-stone-900 ${aspectClass}`}
      onError={() => setError(true)}
    >
      <p className="sr-only">Your browser does not support HTML video.</p>
    </video>
  );
}
