// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import BlogHeader from '@/components/BlogHeader';

vi.mock('next/link', () => ({ default: ({ href, children, ...props }: { href: string; children: ReactNode }) => <a href={href} {...props}>{children}</a> }));
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/lib/supabase/use-session', () => ({ useSession: () => ({ user: null, signOut: vi.fn() }) }));
vi.mock('@/lib/stores/preferences-store', () => ({ useSavedTotalCount: () => 0, useDigestSubscribed: () => false }));
vi.mock('@/lib/motion/hooks', () => ({ useWarmImport: () => ({}) }));
vi.mock('@/components/ThemeToggle', () => ({ default: () => <button type="button">Theme</button> }));

describe('responsive header navigation', () => {
  let container: HTMLDivElement;
  let root: Root;
  let desktop = false;
  let onResize: (() => void) | undefined;
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    desktop = false;
    onResize = undefined;
    vi.stubGlobal('matchMedia', () => ({
      get matches() { return desktop; },
      addEventListener: (_: string, callback: () => void) => { onResize = callback; },
      removeEventListener: () => {},
    }));
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root.render(<BlogHeader />));
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });
  function toggle() {
    const button = container.querySelector<HTMLButtonElement>('button[aria-controls]')!;
    act(() => button.click());
    return button;
  }
  it('preserves real navigation and closes on Escape with focus returned', () => {
    expect(container.querySelector('a[href="/authors"]')).not.toBeNull();
    expect(container.querySelector('a[href="/login"]')).not.toBeNull();
    const button = toggle();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('nav[aria-label="Mobile primary"] a[href="/pricing"]')).not.toBeNull();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(button);
  });
  it('closes the mobile menu when switching to desktop', () => {
    const button = toggle();
    desktop = true;
    act(() => onResize?.());
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });
});
