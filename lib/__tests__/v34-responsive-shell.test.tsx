// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
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

const session = vi.hoisted(() => {
  const signedIn = {
    id: 'reader-1',
    email: 'reader@example.com',
    name: 'Reader',
    isEditor: false,
    providers: ['email'],
    identities: [],
  };
  return { user: signedIn as typeof signedIn | null, hydrated: true, signedIn };
});

vi.mock('@/lib/supabase/use-session', () => ({
  useSession: () => ({ user: session.user, hydrated: session.hydrated, signOut: vi.fn() }),
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
    session.user = session.signedIn;
    session.hydrated = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
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
