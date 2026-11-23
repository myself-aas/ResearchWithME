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
    expect(container.querySelector('nav[aria-label="Mobile primary"] a[href="/pricing"]')).toBeNull();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(button);
  });
  it('opens a right-side drawer that covers about two-thirds of the viewport', () => {
    toggle();
    const dialog = container.querySelector<HTMLElement>('[role="dialog"][aria-label="Navigation menu"]');
    expect(dialog).not.toBeNull();
    // Anchored to the right edge, full height, capped at ~21rem, and sized in
    // viewport units so it reads as a drawer rather than a full-screen takeover.
    expect(dialog!.className).toContain('right-0');
    expect(dialog!.className).toContain('inset-y-0');
    expect(dialog!.className).toContain('w-[72vw]');
    expect(dialog!.className).toContain('max-w-[21rem]');
    expect(dialog!.className).toContain('lg:hidden');
    expect(dialog!.getAttribute('aria-modal')).toBe('true');
    // A dimmed scrim covers the rest of the page and closes the drawer.
    const scrim = container.querySelector<HTMLButtonElement>('button[aria-hidden="true"]');
    expect(scrim).not.toBeNull();
    act(() => scrim!.click());
    expect(container.querySelector('[role="dialog"][aria-label="Navigation menu"]')).toBeNull();
  });

  it('reserves header account actions for desktop widths', () => {
    // The mobile drawer provides account actions below `lg`; the desktop
    // auth cluster stays hidden on phones and tablets to avoid duplication.
    const signIn = container.querySelector<HTMLAnchorElement>('a[href="/login"]');
    const cluster = signIn?.parentElement;
    expect(cluster?.className).toContain('hidden');
    expect(cluster?.className).toContain('lg:flex');
    expect(cluster?.className).not.toContain('md:flex');
  });

  it('never offers a menu trigger where the drawer is hidden', () => {
    act(() =>
      root.render(
        <BlogHeader variant="reading" backHref="/feed" backLabel="Feed" contextTitle="A reading surface" />,
      ),
    );
    const button = container.querySelector<HTMLButtonElement>('button[aria-controls]');
    expect(button).not.toBeNull();
    // Compact reading/editor headers keep the trigger on tablets, but the
    // drawer itself is `lg:hidden`. Without the same guard the button would be
    // visible on desktop and open an invisible panel (locking page scroll).
    expect(button!.className).toContain('lg:hidden');
  });

  it('closes the mobile menu when switching to desktop', () => {
    const button = toggle();
    desktop = true;
    act(() => onResize?.());
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });
});
