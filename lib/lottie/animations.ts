/**
 * πeme Lottie library — four micro-animations, each bound to a §9 pattern.
 *
 * | Animation    | Pattern     | Length                | Used for                                 |
 * |--------------|-------------|-----------------------|------------------------------------------|
 * | `verify`     | verify      | connect (480ms)       | peer-verified / saved / copied           |
 * | `connect`    | connect     | connect (480ms)       | a citation or provenance link is made    |
 * | `synthesize` | synthesize  | synthesize (700ms)    | evidence gathered into one result        |
 * | `attention`  | attention   | 3 × synthesize, stops | a count changed (bounded, never loops)   |
 *
 * All four are 24×24, stroke/fill only, painted in placeholder ink that the
 * player recolours to `currentColor`. None of them loops: the attention cue
 * runs three cycles and stops, matching `AttentionPulse`.
 *
 * The compositions are built once at module load from motion tokens; see
 * ./compose.ts for the contract.
 */

import { DURATION_MS, EASING, SCALE } from '@/lib/motion/tokens';
import {
  composition,
  ellipse,
  fill,
  framesFor,
  group,
  keyframes,
  polyline,
  still,
  stroke,
  trim,
  type LottieComposition,
} from './compose';

const SIZE = 24;
const POP = SCALE.pop * 100;
const PULSE = SCALE.pulse * 100;

const F = {
  fast: framesFor(DURATION_MS.fast),
  standard: framesFor(DURATION_MS.standard),
  deliberate: framesFor(DURATION_MS.deliberate),
  connect: framesFor(DURATION_MS.connect),
  synthesize: framesFor(DURATION_MS.synthesize),
} as const;

/**
 * Verify — the disc pops to 1.12 and settles while the tick draws along its
 * own path, ~120ms behind (secondary action). Mirrors `SuccessCheck`.
 */
function buildVerify(): LottieComposition {
  return composition({
    name: 'pieme-verify',
    size: SIZE,
    frames: F.connect,
    layers: [
      {
        name: 'Tick',
        shapes: [
          group('Tick', [
            polyline([
              [-5.25, 0.4],
              [-1.6, 4],
              [5.4, -3.4],
            ]),
            trim(keyframes([[F.fast, 0], [F.connect, 100]], EASING.enter)),
            stroke(2),
          ]),
        ],
      },
      {
        name: 'Disc',
        shapes: [
          group('Disc', [ellipse(still([20, 20])), stroke(1.75)], {
            scale: keyframes(
              [
                [0, [82, 82]],
                [F.standard, [POP, POP]],
                [F.deliberate, [100, 100]],
              ],
              [EASING.emphasize, EASING.standard],
            ),
          }),
        ],
      },
    ],
  });
}

/**
 * Connect — a link draws from a resolved source node to a new node, which
 * arrives with a small overshoot once the line reaches it.
 */
function buildConnect(): LottieComposition {
  const arrive = framesFor(DURATION_MS.connect - DURATION_MS.fast);
  return composition({
    name: 'pieme-connect',
    size: SIZE,
    frames: F.connect,
    layers: [
      {
        name: 'Link',
        shapes: [
          group('Link', [
            polyline([
              [-4, 0],
              [4, 0],
            ]),
            trim(keyframes([[0, 0], [F.deliberate, 100]], EASING.emphasize)),
            stroke(1.75),
          ]),
        ],
      },
      {
        name: 'Source',
        shapes: [group('Source', [ellipse(still([6, 6])), stroke(1.75)], { position: still([-7, 0]) })],
      },
      {
        name: 'Target',
        shapes: [
          group('Target', [ellipse(still([6, 6])), stroke(1.75)], {
            position: still([7, 0]),
            opacity: keyframes([[F.standard, 0], [F.deliberate, 100]], EASING.enter),
            scale: keyframes(
              [
                [F.standard, [60, 60]],
                [arrive, [POP, POP]],
                [F.connect, [100, 100]],
              ],
              [EASING.emphasize, EASING.standard],
            ),
          }),
        ],
      },
    ],
  });
}

/**
 * Synthesize — three evidence points travel to the centre and merge into a
 * single result. Bounded to 700ms and fully reversible in meaning: the end
 * frame is a plain filled dot.
 */
function buildSynthesize(): LottieComposition {
  const radius = 7;
  const sources = [-90, 30, 150].map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return [Number((Math.cos(rad) * radius).toFixed(3)), Number((Math.sin(rad) * radius).toFixed(3))];
  });

  return composition({
    name: 'pieme-synthesize',
    size: SIZE,
    frames: F.synthesize,
    layers: [
      {
        name: 'Result',
        shapes: [
          group('Result', [ellipse(still([8, 8])), fill()], {
            scale: keyframes(
              [
                [F.deliberate, [0, 0]],
                [F.connect + F.fast, [POP, POP]],
                [F.synthesize, [100, 100]],
              ],
              [EASING.emphasize, EASING.standard],
            ),
          }),
        ],
      },
      ...sources.map((origin, index) => ({
        name: `Evidence ${index + 1}`,
        shapes: [
          group(`Evidence ${index + 1}`, [ellipse(still([4, 4])), fill()], {
            position: keyframes([[0, origin], [F.connect, [0, 0]]], EASING.standard),
            opacity: keyframes([[F.deliberate, 100], [F.connect, 0]], EASING.exit),
          }),
        ],
      })),
    ],
  });
}

/** Attention cycles. Clamped like `AttentionPulse` (max 3, never infinite). */
export const ATTENTION_CYCLES = 3;

/**
 * Attention — a dot breathes to the 1.15 ceiling while a ring ripples out and
 * fades, three times, then rests. The announcement itself is always carried
 * by text; this is decoration.
 */
function buildAttention(): LottieComposition {
  const cycle = F.synthesize;
  const half = Math.round(cycle / 2);
  const scaleStops: Array<[number, number[]]> = [];
  const ringSize: Array<[number, number[]]> = [];
  const ringOpacity: Array<[number, number]> = [];

  for (let n = 0; n < ATTENTION_CYCLES; n += 1) {
    const start = n * cycle;
    scaleStops.push([start, [100, 100]], [start + half, [PULSE, PULSE]]);
    ringSize.push([start, [8, 8]], [start + cycle - 1, [20, 20]]);
    ringOpacity.push([start, 60], [start + cycle - 1, 0]);
  }
  const end = ATTENTION_CYCLES * cycle;
  scaleStops.push([end, [100, 100]]);

  return composition({
    name: 'pieme-attention',
    size: SIZE,
    frames: end,
    layers: [
      {
        name: 'Dot',
        shapes: [
          group('Dot', [ellipse(still([8, 8])), fill()], {
            scale: keyframes(scaleStops, EASING.standard),
          }),
        ],
      },
      {
        name: 'Ripple',
        shapes: [
          group('Ripple', [
            ellipse(keyframes(ringSize, EASING.enter)),
            stroke(1.5, keyframes(ringOpacity, EASING.exit)),
          ]),
        ],
      },
    ],
  });
}

export type LottieAnimationName = 'verify' | 'connect' | 'synthesize' | 'attention';

export const LOTTIE_ANIMATIONS: Readonly<Record<LottieAnimationName, LottieComposition>> = Object.freeze({
  verify: buildVerify(),
  connect: buildConnect(),
  synthesize: buildSynthesize(),
  attention: buildAttention(),
});

/** Duration of a composition in milliseconds (for tests and docs). */
export function lottieDurationMs(animation: LottieComposition): number {
  return Math.round((animation.op / animation.fr) * 1000);
}
