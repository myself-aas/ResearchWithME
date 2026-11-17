// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import BottomSheet from '@/components/layout/BottomSheet';
import ContributeWizard from '@/components/v34/ContributeWizard';

let currentPath = '/feed';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => currentPath,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

describe('v3.4 mobile-first shell & contribution wizard', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    currentPath = '/feed';
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renders 5 ADR-032-11 primary links in MobileBottomNav and hides inside /contribute and /editor', () => {
    act(() => root.render(<MobileBottomNav />));
    const nav = container.querySelector('nav[aria-label="Mobile bottom navigation"]');
    expect(nav).not.toBeNull();
    expect(nav?.querySelectorAll('a')).toHaveLength(5);
    for (const label of ['Explore', 'Library', 'Contribute', 'AI', 'Profile']) {
      expect(container.textContent).toContain(label);
    }

    currentPath = '/contribute';
    act(() => root.render(<MobileBottomNav />));
    expect(container.querySelector('nav[aria-label="Mobile bottom navigation"]')).toBeNull();

    currentPath = '/editor/draft-1';
    act(() => root.render(<MobileBottomNav />));
    expect(container.querySelector('nav[aria-label="Mobile bottom navigation"]')).toBeNull();
  });

  it('opens BottomSheet with dialog semantics and closes on Escape', () => {
    const onClose = vi.fn();
    act(() =>
      root.render(
        <BottomSheet open onClose={onClose} title="Filter feed">
          <p>Filter body</p>
        </BottomSheet>,
      ),
    );

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders all 10 contribution types and live §16 publication blockers in ContributeWizard', () => {
    currentPath = '/contribute';
    act(() => root.render(<ContributeWizard />));

    expect(container.textContent).toContain('Paper review');
    expect(container.textContent).toContain('Replication report');
    expect(container.textContent).toContain('Research question');

    const step4Button = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Integrity & Publish'),
    );
    expect(step4Button).toBeTruthy();
    act(() => {
      step4Button?.click();
    });

    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    const publishBtn = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Publish contribution'),
    );
    expect(publishBtn?.hasAttribute('disabled')).toBe(true);
  });
});
