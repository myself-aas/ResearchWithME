/**
 * Motion system contract — πeme v3.1 §9/§10 + animation-principles.
 *
 * These tests protect the four things that are easy to regress and expensive
 * to notice in review:
 *  1. token parity with the generated πeme tokens (no drifting literals);
 *  2. the timing ceiling and stagger cap;
 *  3. the twelve-principle registry used by `/motion` and the docs;
 *  4. the SSR contract — content is never emitted hidden, and a primitive
 *     works with or without an ambient MotionScope.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import MotionScope from '@/components/motion/MotionScope';
import Reveal from '@/components/motion/Reveal';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { MotionList, MotionItem } from '@/components/motion/MotionList';
import MotionPillGroup from '@/components/motion/MotionPillGroup';
import Pressable from '@/components/motion/Pressable';
import LazyMount from '@/components/motion/LazyMount';
import { SkeletonShard } from '@/components/motion/LoadingState';
import RouteSkeleton from '@/components/ui/RouteSkeleton';
import ReadingActions from '@/components/ReadingActions';
import {
  DURATION_MS,
  DURATION_S,
  EASING,
  SPRING,
  STAGGER,
  TRANSITION,
  staggerDelay,
} from '@/lib/motion/tokens';
import { revealVariants, revealKinds } from '@/lib/motion/variants';
import { PRINCIPLES, PRINCIPLE_BY_ID, easingToCss } from '@/lib/motion/principles';
import { isMotionMode, reducedMotionFor, resolveInitialMode } from '@/lib/motion/mode';
import { lazyWidget } from '@/lib/motion/lazy';

const tokensCss = readFileSync(join(process.cwd(), 'tokens/generated/tokens.css'), 'utf8');

describe('motion tokens', () => {
  it('matches the generated πeme duration and easing tokens exactly', () => {
    for (const [name, value] of Object.entries(DURATION_MS)) {
      expect(tokensCss).toContain(`--pieme-motion-duration-${name}: ${value}ms`);
      expect(DURATION_S[name as keyof typeof DURATION_S]).toBeCloseTo(value / 1000, 5);
    }
    for (const [name, [x1, y1, x2, y2]] of Object.entries(EASING)) {
      expect(tokensCss).toContain(`--pieme-motion-easing-${name}: cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`);
    }
  });

  it('never exceeds the 700ms interface ceiling (§9)', () => {
    const longest = Math.max(...Object.values(DURATION_MS));
    expect(longest).toBe(DURATION_MS.synthesize);
    expect(longest).toBeLessThanOrEqual(700);

    for (const preset of Object.values(TRANSITION)) {
      expect(preset.duration).toBeLessThanOrEqual(0.7);
    }
  });

  it('caps stagger sequences at half a second', () => {
    expect(STAGGER.item).toBeLessThanOrEqual(0.05);
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(1)).toBeCloseTo(STAGGER.item, 5);
    expect(staggerDelay(999)).toBe(STAGGER.cap);
    expect(STAGGER.cap).toBeLessThanOrEqual(0.5);
  });

  it('declares springs with damping (no undamped oscillation)', () => {
    const springs = Object.values(SPRING) as Array<{ stiffness?: number; damping?: number; mass?: number }>;
    expect(springs.length).toBeGreaterThanOrEqual(6);
    for (const spring of springs) {
      expect(spring.damping ?? 0).toBeGreaterThan(0);
      expect(spring.stiffness ?? 0).toBeGreaterThan(0);
    }
  });
});

describe('twelve-principle registry', () => {
  it('contains all twelve principles in canonical order', () => {
    expect(PRINCIPLES).toHaveLength(12);
    expect(PRINCIPLES.map((principle) => principle.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(new Set(PRINCIPLES.map((principle) => principle.id)).size).toBe(12);
  });

  it('gives every principle a pattern, a guardrail, and real primitives', () => {
    for (const principle of PRINCIPLES) {
      expect(principle.intent.length).toBeGreaterThan(20);
      expect(principle.appliedTo.length).toBeGreaterThan(0);
      expect(principle.guardrail.length).toBeGreaterThan(20);
      expect(principle.primitives.length).toBeGreaterThan(0);
      expect(['reveal', 'connect', 'verify', 'synthesize', 'archive']).toContain(principle.pattern);
      if (principle.durationMs !== null) {
        expect(principle.durationMs).toBeLessThanOrEqual(700);
      }
      expect(Object.keys(EASING)).toContain(principle.easing);
    }
  });

  it('exposes a lookup and CSS easings that match the token layer', () => {
    expect(PRINCIPLE_BY_ID['slow-in-out'].name).toBe('Slow In and Slow Out');
    expect(easingToCss('standard')).toBe('cubic-bezier(0.2, 0, 0, 1)');
  });
});

describe('reveal variants', () => {
  it('defines a hidden and a visible pose for every kind', () => {
    expect(revealKinds).toHaveLength(7);
    for (const kind of revealKinds) {
      const variants = revealVariants[kind];
      expect(variants.hidden, kind).toBeTruthy();
      expect(variants.visible, kind).toBeTruthy();
    }
  });

  it('keeps every reveal inside the distance and scale budgets', () => {
    for (const kind of revealKinds) {
      const hidden = revealVariants[kind].hidden as Record<string, number | string | undefined>;
      if (typeof hidden.y === 'number') expect(Math.abs(hidden.y)).toBeLessThanOrEqual(24);
      if (typeof hidden.x === 'number') expect(Math.abs(hidden.x)).toBeLessThanOrEqual(24);
      if (typeof hidden.scale === 'number') expect(hidden.scale).toBeGreaterThanOrEqual(0.95);
    }
  });
});

describe('motion modes', () => {
  it('validates and resolves modes, defaulting to the OS preference', () => {
    expect(isMotionMode('full')).toBe(true);
    expect(isMotionMode('reduced')).toBe(true);
    expect(isMotionMode('static')).toBe(true);
    expect(isMotionMode('wild')).toBe(false);
    expect(resolveInitialMode('static', false)).toBe('static');
    expect(resolveInitialMode(null, true)).toBe('reduced');
    expect(resolveInitialMode(undefined, false)).toBe('full');
    expect(reducedMotionFor('full')).toBe('user');
    expect(reducedMotionFor('reduced')).toBe('always');
    expect(reducedMotionFor('static')).toBe('always');
  });
});

describe('SSR contract — content is never emitted hidden', () => {
  it('Reveal renders its children and no opacity styles without a scope or JavaScript', () => {
    const html = renderToStaticMarkup(
      createElement(Reveal, { variant: 'arc' }, createElement('p', null, 'Methods and annotations')),
    );
    expect(html).toContain('Methods and annotations');
    expect(html).not.toContain('opacity:0');
    expect(html).not.toContain('opacity: 0');
    expect(html).not.toContain('clip-path');
  });

  it('Stagger renders every item with no hidden style, nested scopes included', () => {
    const html = renderToStaticMarkup(
      createElement(
        MotionScope,
        null,
        createElement(
          Stagger,
          { as: 'ul' },
          createElement(StaggerItem, { as: 'li' }, 'Alpha'),
          createElement(StaggerItem, { as: 'li' }, 'Beta'),
        ),
      ),
    );
    expect(html).toContain('Alpha');
    expect(html).toContain('Beta');
    expect(html).not.toContain('opacity:0');
    expect(html.match(/<li/g)?.length).toBe(2);
  });

  it('MotionList keeps items in the payload (AnimatePresence is SSR-safe)', () => {
    const html = renderToStaticMarkup(
      createElement(
        MotionList,
        null,
        createElement(MotionItem, { key: 'a' }, 'first'),
        createElement(MotionItem, { key: 'b' }, 'second'),
      ),
    );
    expect(html).toContain('first');
    expect(html).toContain('second');
  });

  it('Pressable keeps the native button contract', () => {
    const html = renderToStaticMarkup(
      createElement(Pressable, { 'aria-pressed': true }, 'Save to reading list'),
    );
    expect(html).toContain('<button');
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-pressed="true"');
  });

  it('MotionPillGroup preserves toggle semantics and the indicator is decorative', () => {
    const html = renderToStaticMarkup(
      createElement(MotionPillGroup, {
        options: [
          { id: 'all', label: 'All topics', count: 12 },
          { id: 'methods', label: 'Methods' },
        ],
        value: 'all',
        onValueChange: () => {},
        label: 'Research topic',
        groupId: 'test-topics',
      }),
    );
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('All topics');
    expect(html).toContain('aria-hidden="true"');
  });
});

describe('lazy loading boundaries', () => {
  it('LazyMount reserves a labelled placeholder server-side', () => {
    const html = renderToStaticMarkup(
      createElement(LazyMount, { label: 'Loading provenance graph', minHeight: 360 }, createElement('p', null, 'widget')),
    );
    expect(html).toContain('Loading provenance graph');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('data-lazy-state="deferred"');
    expect(html).toContain('min-height:360px');
    expect(html).not.toContain('widget');
  });

  it('SkeletonShard is decorative and bounded', () => {
    const html = renderToStaticMarkup(createElement(SkeletonShard, { lines: 3 }));
    expect(html).toContain('aria-hidden="true"');
    expect((html.match(/aria-hidden="true"/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(html).not.toContain('infinite');
  });

  it('lazyWidget returns a component that can be rendered by a boundary', () => {
    const Widget = lazyWidget(async () => ({ default: () => createElement('span', null, 'heavy') }), {
      label: 'Loading widget',
      minHeight: 200,
    });
    expect(typeof Widget).toBe('function');
  });

  it('route skeletons keep the page shape without hiding content', () => {
    for (const variant of ['article', 'archive', 'profile'] as const) {
      const html = renderToStaticMarkup(createElement(RouteSkeleton, { variant, label: 'Loading papers' }));
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain('Loading papers');
      expect(html).toContain('animate-pulse');
      expect(html).not.toContain('opacity:0');
    }
  });

  it('ReadingActions renders its controls visible on the server', () => {
    const html = renderToStaticMarkup(
      createElement(ReadingActions, {
        itemId: 'post-1',
        storageKey: 'rwm_saved_posts',
        title: 'Paged attention',
        doi: '10.5555/rwm.post-1',
        showPrint: true,
      }),
    );
    expect(html).toContain('Save to reading list');
    expect(html).toContain('Copy DOI');
    expect(html).toContain('type="button"');
    expect(html).not.toContain('opacity:0');
  });
});
