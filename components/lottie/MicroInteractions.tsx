'use client';

/**
 * reme Lottie micro-interactions — named, decorative state glyphs.
 *
 * Each component pairs one composition from `lib/lottie/animations.ts` with
 * its resting frame drawn as inline SVG. The SVG is what renders on the
 * server, without JavaScript, and in reduced/static motion modes, so the
 * glyph always means the same thing whether or not it moves.
 *
 * All are `aria-hidden`; the caller renders the text ("Verified",
 * "Synthesis complete", "3 saved") that carries the meaning.
 */

import { LOTTIE_ANIMATIONS } from '@/lib/lottie/animations';
import LottiePlayer from './LottiePlayer';

export interface MicroInteractionProps {
  /** Rendered edge in px. Default 24. */
  size?: number;
  /** Change to replay (e.g. a save counter). */
  playKey?: string | number;
  /** Play on mount. When false, nothing loads until the first `playKey` change. Default true. */
  autoplay?: boolean;
  className?: string;
  onComplete?: () => void;
}

const svgProps = {
  viewBox: '0 0 24 24',
  width: '100%',
  height: '100%',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  focusable: false,
  'aria-hidden': true,
} as const;

function VerifyRest() {
  return (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="10" strokeWidth="1.75" />
      <path d="M6.75 12.4 10.4 16 17.4 8.6" strokeWidth="2" />
    </svg>
  );
}

function ConnectRest() {
  return (
    <svg {...svgProps} strokeWidth="1.75">
      <circle cx="5" cy="12" r="3" />
      <path d="M8 12h8" />
      <circle cx="19" cy="12" r="3" />
    </svg>
  );
}

function SynthesizeRest() {
  return (
    <svg {...svgProps} stroke="none">
      <circle cx="12" cy="12" r="4" fill="currentColor" />
    </svg>
  );
}

function AttentionRest() {
  return (
    <svg {...svgProps} stroke="none">
      <circle cx="12" cy="12" r="4" fill="currentColor" />
    </svg>
  );
}

/** Peer-verified, saved, copied. Pattern: verify. */
export function VerifyMark(props: MicroInteractionProps) {
  return <LottiePlayer animation={LOTTIE_ANIMATIONS.verify} fallback={<VerifyRest />} {...props} />;
}

/** A citation or provenance link was created. Pattern: connect. */
export function ConnectMark(props: MicroInteractionProps) {
  return <LottiePlayer animation={LOTTIE_ANIMATIONS.connect} fallback={<ConnectRest />} {...props} />;
}

/** Evidence gathered into a single result. Pattern: synthesize. */
export function SynthesizeMark(props: MicroInteractionProps) {
  return <LottiePlayer animation={LOTTIE_ANIMATIONS.synthesize} fallback={<SynthesizeRest />} {...props} />;
}

/**
 * A count changed. Bounded: three cycles, then rests (never loops). Render it
 * only while the change is fresh and show one attention cue at a time.
 */
export function AttentionMark(props: MicroInteractionProps) {
  return <LottiePlayer animation={LOTTIE_ANIMATIONS.attention} fallback={<AttentionRest />} {...props} />;
}
