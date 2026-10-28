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
      <div className={`${aspectClass} flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-stone-300 bg-stone-50 text-sm text-stone-500`}>
        <Film className="h-8 w-8 text-stone-400" aria-hidden="true" />
        <span className="font-medium">Render pending</span>
        <code className="rounded bg-stone-100 px-2 py-0.5 text-xs text-stone-600">{src}</code>
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
