import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import MobileBottomNav from '@/components/layout/MobileBottomNav';

/**
 * SSR contract: the mobile bottom nav is signed-in chrome. Until the browser
 * session hydrates it (and for signed-out visitors) it emits NOTHING — so the
 * optional newInLibrary badge can never flash, diverge hydration, or leak an
 * unread count into the anonymous paint.
 */

vi.mock('next/navigation', () => ({ usePathname: () => '/feed' }));
vi.mock('@/lib/supabase/use-session', () => ({
  useSession: () => ({
    user: {
      id: 'reader-1',
      email: 'reader@example.com',
      name: 'Reader',
      isEditor: false,
      providers: ['email'],
      identities: [],
    },
    hydrated: false, // the pre-hydration paint
    signOut: vi.fn(),
  }),
}));

describe('engagement chrome — SSR paint', () => {
  it('emits nothing pre-hydration, even with a badge count present', () => {
    expect(renderToString(createElement(MobileBottomNav, { newInLibrary: 3 }))).toBe('');
  });

  it('emits nothing pre-hydration without the badge prop either', () => {
    expect(renderToString(createElement(MobileBottomNav))).toBe('');
  });
});
