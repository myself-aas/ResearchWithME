import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DURATION_MS, EASING } from '@/lib/motion/tokens';
import { LOTTIE_FPS, framesFor, keyframes } from '@/lib/lottie/compose';
import { ATTENTION_CYCLES, LOTTIE_ANIMATIONS, lottieDurationMs, type LottieAnimationName } from '@/lib/lottie/animations';
import { AttentionMark, ConnectMark, SynthesizeMark, VerifyMark } from '@/components/lottie';

const TOKEN_EASINGS = Object.values(EASING).map((curve) => curve.join(','));

/** Every keyframe segment in a composition, wherever it is nested. */
function collectKeyframes(node: unknown, out: Array<{ o?: { x: number[]; y: number[] }; i?: { x: number[]; y: number[] } }> = []) {
  if (Array.isArray(node)) node.forEach((child) => collectKeyframes(child, out));
  else if (node && typeof node === 'object') {
    const record = node as Record<string, unknown>;
    if (record.a === 1 && Array.isArray(record.k)) out.push(...(record.k as typeof out));
    Object.values(record).forEach((child) => collectKeyframes(child, out));
  }
  return out;
}

describe('lottie compose', () => {
  it('converts token durations to frames at 60fps', () => {
    expect(LOTTIE_FPS).toBe(60);
    expect(framesFor(DURATION_MS.connect)).toBe(28); // 28.8 → floor, never over budget
    expect(framesFor(DURATION_MS.synthesize)).toBe(42);
    expect(framesFor(0)).toBe(0);
  });

  it('writes bezier tangents on every segment except the last', () => {
    const value = keyframes([[0, 0], [10, 50], [20, 100]], EASING.standard);
    expect(value.k[0].o).toEqual({ x: [0.2], y: [0] });
    expect(value.k[0].i).toEqual({ x: [0], y: [1] });
    expect(value.k[2].o).toBeUndefined();
  });
});

describe('lottie animations', () => {
  const names = Object.keys(LOTTIE_ANIMATIONS) as LottieAnimationName[];

  it.each(names)('%s is a valid 24×24, non-looping composition', (name) => {
    const animation = LOTTIE_ANIMATIONS[name];
    expect(animation.w).toBe(24);
    expect(animation.h).toBe(24);
    expect(animation.fr).toBe(LOTTIE_FPS);
    expect(animation.layers.length).toBeGreaterThan(0);
    for (const layer of animation.layers) expect(layer.op).toBe(animation.op);
  });

  it.each(names)('%s uses only reme token easings', (name) => {
    for (const frame of collectKeyframes(LOTTIE_ANIMATIONS[name])) {
      if (!frame.o || !frame.i) continue;
      const curve = [frame.o.x[0], frame.o.y[0], frame.i.x[0], frame.i.y[0]].join(',');
      expect(TOKEN_EASINGS).toContain(curve);
    }
  });

  it('keeps durations inside the §9 budget', () => {
    expect(lottieDurationMs(LOTTIE_ANIMATIONS.verify)).toBeLessThanOrEqual(DURATION_MS.connect);
    expect(lottieDurationMs(LOTTIE_ANIMATIONS.connect)).toBeLessThanOrEqual(DURATION_MS.connect);
    expect(lottieDurationMs(LOTTIE_ANIMATIONS.synthesize)).toBeLessThanOrEqual(DURATION_MS.synthesize);
    // Attention is bounded: three cycles, then it stops.
    expect(ATTENTION_CYCLES).toBe(3);
    expect(lottieDurationMs(LOTTIE_ANIMATIONS.attention)).toBeLessThanOrEqual(3 * DURATION_MS.synthesize);
  });

  it('is deterministic and frozen', () => {
    expect(Object.isFrozen(LOTTIE_ANIMATIONS)).toBe(true);
    expect(JSON.stringify(LOTTIE_ANIMATIONS.verify)).toMatchSnapshot();
  });
});

describe('lottie micro-interactions (SSR)', () => {
  it.each([
    ['verify', VerifyMark],
    ['connect', ConnectMark],
    ['synthesize', SynthesizeMark],
    ['attention', AttentionMark],
  ] as const)('%s server-renders its static resting frame, decorative only', (name, Mark) => {
    const html = renderToStaticMarkup(createElement(Mark, { size: 20 }));
    expect(html).toContain(`data-lottie="reme-${name}"`);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('<svg');
    expect(html).toContain('width:20px');
    // Content is never hidden on the server.
    expect(html).not.toContain('invisible');
    expect(html).not.toContain('opacity:0');
    // The playback container is always in the markup, so a client that turns
    // out to prefer reduced motion still hydrates the same tree.
    expect(html).toContain('<span class="absolute inset-0"></span>');
  });
});
