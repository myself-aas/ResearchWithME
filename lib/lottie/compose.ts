/**
 * Lottie composition builders — πeme motion tokens → Bodymovin JSON.
 *
 * πeme Lottie files are not exported from After Effects. They are composed in
 * code from `lib/motion/tokens.ts`, which keeps three guarantees the motion
 * system already makes (docs/motion-system.md):
 *
 *  - **Tokens only.** Every duration is a `DURATION_MS` value converted to
 *    frames, and every keyframe easing is one of the four `EASING` curves.
 *  - **Theme-safe.** Shapes are painted in a placeholder ink and the player
 *    recolours them to `currentColor` with CSS (`.pieme-lottie` in
 *    globals.css), so the Archival Paper and Obsidian themes need no second
 *    asset.
 *  - **Deterministic.** Builders are pure; the same call returns the same
 *    JSON, so the animations can be snapshot-tested and reused by the
 *    HyperFrames token consumers without a runtime.
 *
 * The module is inert data (no DOM, no React) and safe on the server.
 */

import type { BezierEasing } from '@/lib/motion/tokens';

/** Playback rate for every πeme composition. */
export const LOTTIE_FPS = 60;

/** Placeholder ink. Recoloured to `currentColor` by `.pieme-lottie`. */
const INK: [number, number, number, number] = [0, 0, 0, 1];

/**
 * Convert a token duration (ms) to a whole frame count at `LOTTIE_FPS`.
 * Rounds down so a composition never runs past its duration token.
 */
export function framesFor(ms: number): number {
  return Math.max(0, Math.floor((ms * LOTTIE_FPS) / 1000 + 1e-9));
}

type Scalar = number | number[];

interface Tangent {
  x: number[];
  y: number[];
}

export interface LottieKeyframe {
  t: number;
  s: number[];
  o?: Tangent;
  i?: Tangent;
}

export interface LottieStaticValue<T = Scalar> {
  a: 0;
  k: T;
}

export interface LottieAnimatedValue {
  a: 1;
  k: LottieKeyframe[];
}

export type LottieValue<T = Scalar> = LottieStaticValue<T> | LottieAnimatedValue;

export interface LottiePathData {
  i: number[][];
  o: number[][];
  v: number[][];
  c: boolean;
}

/** Shape items are loosely typed: the Bodymovin schema is large and open. */
export type LottieShape = { ty: string; nm?: string } & Record<string, unknown>;

export interface LottieLayer {
  ddd: 0;
  ind: number;
  ty: 4;
  nm: string;
  sr: 1;
  ks: Record<string, LottieValue>;
  ao: 0;
  shapes: LottieShape[];
  ip: number;
  op: number;
  st: 0;
  bm: 0;
}

export interface LottieComposition {
  v: string;
  fr: number;
  ip: 0;
  op: number;
  w: number;
  h: number;
  nm: string;
  ddd: 0;
  assets: [];
  layers: LottieLayer[];
}

/** A value that does not animate. */
export function still<T = Scalar>(k: T): LottieStaticValue<T> {
  return { a: 0, k };
}

/**
 * Keyframed value. `stops` are `[frame, value]` pairs in ascending frame
 * order; each segment uses `easing` (a πeme `EASING` tuple), or the matching
 * entry when an array of easings is given.
 */
export function keyframes(
  stops: ReadonlyArray<readonly [number, Scalar]>,
  easing: BezierEasing | ReadonlyArray<BezierEasing>,
): LottieAnimatedValue {
  const easingFor = (segment: number): BezierEasing =>
    isEasingList(easing) ? easing[Math.min(segment, easing.length - 1)] : easing;

  return {
    a: 1,
    k: stops.map(([t, value], index) => {
      const s = Array.isArray(value) ? [...value] : [value];
      if (index === stops.length - 1) return { t, s };
      const [x1, y1, x2, y2] = easingFor(index);
      return { t, s, o: { x: [x1], y: [y1] }, i: { x: [x2], y: [y2] } };
    }),
  };
}

function isEasingList(value: BezierEasing | ReadonlyArray<BezierEasing>): value is ReadonlyArray<BezierEasing> {
  return Array.isArray(value[0]);
}

export function ellipse(size: LottieValue, position: LottieValue = still([0, 0])): LottieShape {
  return { ty: 'el', nm: 'Ellipse', d: 1, p: position, s: size };
}

/** Polyline through `points` with sharp corners (zero tangents). */
export function polyline(points: number[][], closed = false): LottieShape {
  const zero = points.map(() => [0, 0]);
  const data: LottiePathData = { i: zero, o: zero.map((p) => [...p]), v: points.map((p) => [...p]), c: closed };
  return { ty: 'sh', nm: 'Path', d: 1, ks: still(data) };
}

export function stroke(width: number, opacity: LottieValue = still(100)): LottieShape {
  return { ty: 'st', nm: 'Stroke', c: still(INK), o: opacity, w: still(width), lc: 2, lj: 2, ml: 4, bm: 0 };
}

export function fill(opacity: LottieValue = still(100)): LottieShape {
  return { ty: 'fl', nm: 'Fill', c: still(INK), o: opacity, r: 1, bm: 0 };
}

/** Trim paths: draw a stroke from `start`% to `end`% of its length. */
export function trim(end: LottieValue, start: LottieValue = still(0)): LottieShape {
  return { ty: 'tm', nm: 'Trim', s: start, e: end, o: still(0), m: 1 };
}

export interface GroupTransform {
  position?: LottieValue;
  scale?: LottieValue;
  opacity?: LottieValue;
  rotation?: LottieValue;
}

export function group(name: string, items: LottieShape[], transform: GroupTransform = {}): LottieShape {
  return {
    ty: 'gr',
    nm: name,
    it: [
      ...items,
      {
        ty: 'tr',
        nm: 'Transform',
        p: transform.position ?? still([0, 0]),
        a: still([0, 0]),
        s: transform.scale ?? still([100, 100]),
        r: transform.rotation ?? still(0),
        o: transform.opacity ?? still(100),
        sk: still(0),
        sa: still(0),
      },
    ],
  };
}

export interface CompositionSpec {
  name: string;
  /** Square canvas edge in px. Shapes are authored around its centre. */
  size: number;
  /** Total length in frames. */
  frames: number;
  /** Layers, top-most first. Each is centred on the canvas. */
  layers: Array<{ name: string; shapes: LottieShape[]; transform?: GroupTransform }>;
}

/** Assemble a Bodymovin composition from centred shape layers. */
export function composition({ name, size, frames, layers }: CompositionSpec): LottieComposition {
  const centre = size / 2;
  return {
    v: '5.7.4',
    fr: LOTTIE_FPS,
    ip: 0,
    op: frames,
    w: size,
    h: size,
    nm: name,
    ddd: 0,
    assets: [],
    layers: layers.map((layer, index) => ({
      ddd: 0,
      ind: index + 1,
      ty: 4,
      nm: layer.name,
      sr: 1,
      ks: {
        o: layer.transform?.opacity ?? still(100),
        r: layer.transform?.rotation ?? still(0),
        p: layer.transform?.position ?? still([centre, centre, 0]),
        a: still([0, 0, 0]),
        s: layer.transform?.scale ?? still([100, 100, 100]),
      },
      ao: 0,
      shapes: layer.shapes,
      ip: 0,
      op: frames,
      st: 0,
      bm: 0,
    })),
  };
}
