// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ArticleInteractions from '@/components/ArticleInteractions';
import { usePreferencesStore } from '@/lib/stores/preferences-store';

let element: HTMLDivElement;
let root: Root;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
beforeEach(() => {
  localStorage.clear();
  usePreferencesStore.setState({ hydrated: true, likedPostIds: [], savedPostIds: [] });
  element = document.createElement('div');
  document.body.append(element);
  root = createRoot(element);
  act(() => root.render(<ArticleInteractions postId="p1" title="Fixture" initialLikes={2} />));
});
afterEach(() => {
  act(() => root.unmount());
  element.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it('related article actions share the same geometry', () => {
  const buttons = [...element.querySelectorAll('button')];
  expect(buttons).toHaveLength(4);
  for (const button of buttons) {
    for (const cls of ['min-h-11', 'rounded-full', 'px-3', 'py-2', 'font-sans', 'text-xs', 'font-medium']) expect(button.classList.contains(cls), `${button.textContent}: ${cls}`).toBe(true);
  }
  expect(buttons[1].getAttribute('aria-pressed')).toBe('false');
});
it('failed like rolls back and reports failure', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  const button = element.querySelector('button')!;
  await act(async () => { button.click(); await Promise.resolve(); await Promise.resolve(); });
  expect(button.getAttribute('aria-pressed')).toBe('false');
  expect(button.textContent).toContain('2');
  expect(element.querySelector('[role=status]')?.textContent).toContain('The like could not be recorded. Check your connection and try again.');
});
it('clipboard rejection reports failure', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
  const button = [...element.querySelectorAll('button')].find((item) => item.textContent?.includes('Copy link'))!;
  await act(async () => { button.click(); await Promise.resolve(); });
  expect(element.querySelector('[role=status]')?.textContent).toContain('Clipboard access was blocked. Copy the address from your browser.');
  expect(button.textContent).not.toContain('Copied');
});
