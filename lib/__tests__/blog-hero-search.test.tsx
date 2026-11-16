// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import BlogHero from '@/components/BlogHero';

it('offers an accessible 44px clear-search action that clears the query', () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const onSearch = vi.fn();
  const element = document.createElement('div');
  document.body.append(element);
  const root = createRoot(element);
  try {
    act(() => root.render(<MemoryRouter><BlogHero searchQuery="evidence" setSearchQuery={onSearch} selectedFormat="All" setSelectedFormat={() => {}} totalArticles={1} totalWriters={1} /></MemoryRouter>));
    const button = [...element.querySelectorAll('button')].find((item) => item.textContent?.includes('Clear search'))!;
    expect(button).toBeDefined();
    expect(button.classList.contains('h-11')).toBe(true);
    expect(button.classList.contains('w-11')).toBe(true);
    act(() => button.click());
    expect(onSearch).toHaveBeenCalledWith('');
  } finally { act(() => root.unmount()); element.remove(); }
});

it('keeps category and format controls at least 44px while retaining selection', () => {
  const onCategory = vi.fn();
  const onFormat = vi.fn();
  const element = document.createElement('div');
  document.body.append(element);
  const root = createRoot(element);
  try {
    act(() => root.render(<MemoryRouter><BlogHero searchQuery="" setSearchQuery={() => {}} selectedCategory="All" setSelectedCategory={onCategory} selectedFormat="All" setSelectedFormat={onFormat} totalArticles={1} totalWriters={1} /></MemoryRouter>));
    const groups = element.querySelectorAll('[role="group"]');
    expect(groups).toHaveLength(2);
    for (const button of element.querySelectorAll('[role="group"] button')) expect(button.classList.contains('min-h-11')).toBe(true);
    const paper = [...groups[1].querySelectorAll('button')].find((item) => item.textContent?.includes('Paper Review'))!;
    act(() => paper.click());
    expect(onFormat).toHaveBeenCalledWith('Paper Review');
    expect(groups[0].querySelector('[aria-pressed="true"]')?.textContent).toContain('All columns');
  } finally { act(() => root.unmount()); element.remove(); }
});

it('does not animate browsing to the feed when the OS requests reduced motion', () => {
  const scroll = vi.fn();
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
  const feed = document.createElement('div');
  feed.id = 'articles-feed';
  feed.scrollIntoView = scroll;
  document.body.append(feed);
  const element = document.createElement('div');
  document.body.append(element);
  const root = createRoot(element);
  try {
    act(() => root.render(<MemoryRouter><BlogHero searchQuery="" setSearchQuery={() => {}} selectedFormat="All" setSelectedFormat={() => {}} totalArticles={1} totalWriters={1} /></MemoryRouter>));
    const browse = [...element.querySelectorAll('button')].find((button) => button.textContent?.includes('Browse index'))!;
    act(() => browse.click());
    expect(scroll).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
  } finally { act(() => root.unmount()); element.remove(); feed.remove(); vi.unstubAllGlobals(); }
});

it('does not animate browsing when the reader selects static motion', async () => {
  const { default: MotionModeProvider } = await import('@/components/motion/MotionModeProvider');
  const scroll = vi.fn();
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
  localStorage.setItem('rwm-motion-mode', 'static');
  const feed = document.createElement('div');
  feed.id = 'articles-feed';
  feed.scrollIntoView = scroll;
  document.body.append(feed);
  const element = document.createElement('div');
  document.body.append(element);
  const root = createRoot(element);
  try {
    await act(async () => root.render(<MemoryRouter><MotionModeProvider><BlogHero searchQuery="" setSearchQuery={() => {}} selectedFormat="All" setSelectedFormat={() => {}} totalArticles={1} totalWriters={1} /></MotionModeProvider></MemoryRouter>));
    const browse = [...element.querySelectorAll('button')].find((button) => button.textContent?.includes('Browse index'))!;
    act(() => browse.click());
    expect(scroll).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
  } finally { act(() => root.unmount()); element.remove(); feed.remove(); localStorage.removeItem('rwm-motion-mode'); document.documentElement.removeAttribute('data-motion-mode'); vi.unstubAllGlobals(); }
});
