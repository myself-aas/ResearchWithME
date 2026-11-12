'use client';

/**
 * LottiePlayer — the single Lottie boundary in the app.
 *
 * Contract (docs/motion-system.md §Lottie):
 *  - **Static first.** `fallback` (the animation's resting frame as inline
 *    SVG) is server-rendered and stays visible until the player has drawn its
 *    first frame. Without JavaScript, in `reduced`/`static` motion modes, or
 *    under `prefers-reduced-motion`, the fallback is all that ever renders.
 *  - **Lazy runtime.** `lottie-web`'s SVG-only light build (~46 KB gzip) is
 *    imported on first use, never with the shell.
 *  - **Decorative.** The player is `aria-hidden`; the state change it
 *    illustrates must already be announced in text by the caller.
 *  - **Theme-safe.** `.pieme-lottie` recolours every painted shape to
 *    `currentColor` (globals.css), so callers colour it with `text-*` tokens.
 *  - **Replayable.** Change `playKey` to play again (e.g. on each save).
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useMotionMode } from '@/components/motion/MotionModeProvider';
import type { LottieComposition } from '@/lib/lottie/compose';

type LottieModule = typeof import('lottie-web/build/player/lottie_light');
type AnimationItem = ReturnType<LottieModule['default']['loadAnimation']>;

let runtime: Promise<LottieModule['default']> | null = null;
function loadRuntime() {
  runtime ??= import('lottie-web/build/player/lottie_light').then((module) => module.default);
  return runtime;
}

export interface LottiePlayerProps {
  animation: LottieComposition;
  /** Resting-frame artwork shown on the server, before load, and when motion is off. */
  fallback: ReactNode;
  /** Rendered edge in px. Default 24. */
  size?: number;
  /** Play on mount. When false, the runtime loads on the first `playKey` change. Default true. */
  autoplay?: boolean;
  /** Change this value to replay from the first frame. */
  playKey?: string | number;
  className?: string;
  style?: CSSProperties;
  onComplete?: () => void;
}

export default function LottiePlayer({
  animation,
  fallback,
  size = 24,
  autoplay = true,
  playKey,
  className,
  style,
  onComplete,
}: LottiePlayerProps) {
  const { mode } = useMotionMode();
  const osReduced = useReducedMotion();
  const enabled = mode === 'full' && !osReduced;

  const container = useRef<HTMLSpanElement>(null);
  const itemRef = useRef<AnimationItem | null>(null);
  const completeRef = useRef(onComplete);
  const [drawn, setDrawn] = useState(false);
  // With autoplay off, nothing loads until the first replay request: the
  // static fallback already shows the resting frame, and a paused Lottie
  // would show frame 0 (a half-drawn glyph) instead.
  const [armed, setArmed] = useState(autoplay);

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!enabled || !armed || !container.current) return;
    const host = container.current;
    let item: AnimationItem | null = null;
    let cancelled = false;

    loadRuntime()
      .then((lottie) => {
        if (cancelled) return;
        item = itemRef.current = lottie.loadAnimation({
          container: host,
          renderer: 'svg',
          loop: false,
          autoplay: true,
          // lottie-web mutates animationData in place; give each load its own copy.
          animationData: structuredClone(animation),
          rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
        });
        item.addEventListener('DOMLoaded', () => setDrawn(true));
        item.addEventListener('complete', () => completeRef.current?.());
      })
      .catch(() => {
        /* runtime failed to load — the static fallback is already correct */
      });

    return () => {
      cancelled = true;
      item?.destroy();
      itemRef.current = null;
      setDrawn(false);
    };
  }, [enabled, armed, animation]);

  // Replay without tearing down the player (no fallback flash).
  const lastKey = useRef(playKey);
  useEffect(() => {
    if (lastKey.current === playKey) return;
    lastKey.current = playKey;
    if (itemRef.current) itemRef.current.goToAndPlay(0, true);
    else setArmed(true);
  }, [playKey]);

  const live = enabled && drawn;

  return (
    <span
      aria-hidden="true"
      data-lottie={animation.nm}
      className={cn('pieme-lottie relative inline-flex shrink-0', className)}
      style={{ width: size, height: size, ...style }}
    >
      <span className={cn('inline-flex h-full w-full', live && 'invisible')}>{fallback}</span>
      {/* Always rendered (empty until playback) so server and client trees match:
          the server cannot know the reader's reduced-motion preference. */}
      <span ref={container} className="absolute inset-0" />
    </span>
  );
}
