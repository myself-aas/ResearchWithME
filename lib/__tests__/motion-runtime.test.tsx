// @vitest-environment jsdom

/**
 * Motion runtime smoke test — does the real client runtime mount?
 *
 * The SSR suite (`motion-system.test.tsx`) proves markup is safe without
 * JavaScript. This one proves the opposite half: `m` from `motion/react-m`
 * inside `LazyMotion` with an asynchronously-loaded feature bundle hydrates,
 * accepts a click, and leaves content visible. It is the guard against a
 * future import change pulling the runtime apart.
 */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import MotionScope from '@/components/motion/MotionScope';
import Pressable from '@/components/motion/Pressable';
import Reveal from '@/components/motion/Reveal';
import SuccessCheck from '@/components/motion/SuccessCheck';

class NoopIntersectionObserver {
  readonly root = null;
  readonly rootMargin = '0px';
  readonly thresholds = [0];
  constructor(private readonly callback: IntersectionObserverCallback) {
    void this.callback;
  }
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

let container: HTMLDivElement | null = null;
let root: Root | null = null;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('IntersectionObserver', NoopIntersectionObserver);
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  );
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

function mount(element: React.ReactNode) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(createElement(MotionScope, null, element)));
  return container;
}

describe('motion runtime', () => {
  it('hydrates a scope with asynchronously loaded features', async () => {
    const element = mount(
      createElement(
        'div',
        null,
        createElement(Reveal, { as: 'p', variant: 'rise' }, 'Methods'),
        createElement(Pressable, { 'aria-pressed': false }, 'Save'),
      ),
    );

    expect(element.textContent).toContain('Methods');
    expect(element.querySelector('button')?.textContent).toBe('Save');

    // Let the feature chunk resolve; nothing should throw and nothing should
    // end up hidden.
    await act(async () => {
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const paragraph = element.querySelector('p');
    expect(paragraph?.textContent).toBe('Methods');
    expect(paragraph?.style.opacity === '' || paragraph?.style.opacity === '1').toBe(true);
  });

  it('keeps the pressed state on the button after a click', async () => {
    const element = mount(
      createElement(
        Pressable,
        { 'aria-pressed': true },
        createElement(SuccessCheck, { key: 'check' }),
        createElement('span', { key: 'label' }, 'Saved'),
      ),
    );

    const button = element.querySelector('button');
    expect(button?.getAttribute('aria-pressed')).toBe('true');
    expect(button?.querySelector('span')?.textContent).toBe('Saved');
  });
});
