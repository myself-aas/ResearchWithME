// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import ArticleFeed from '@/components/ArticleFeed';

it('keeps filter reset actions consistent and functional', async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  const clear = vi.fn();
  const element = document.createElement('div');
  document.body.append(element);
  const root = createRoot(element);
  try {
    await act(async () => root.render(<MemoryRouter><ArticleFeed posts={[]} savedPostIds={[]} onToggleSave={() => {}} onLikePost={() => {}} selectedCategory="Research Reviews" selectedFormat="Paper Review" searchQuery="unmatched" onClearFilters={clear} /></MemoryRouter>));
    const buttons = [...element.querySelectorAll('button')].filter((button) => ['All columns', 'Clear all filters', 'Reset filters'].includes(button.textContent?.trim() || ''));
    expect(buttons).toHaveLength(3);
    for (const button of buttons) {
      for (const cls of ['min-h-11', 'rounded-full', 'px-6', 'py-2', 'font-sans', 'text-sm', 'font-semibold']) expect(button.classList.contains(cls), `${button.textContent}: ${cls}`).toBe(true);
      act(() => button.click());
    }
    expect(clear).toHaveBeenCalledTimes(3);
  } finally { act(() => root.unmount()); element.remove(); vi.unstubAllGlobals(); }
});
