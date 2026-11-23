// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import MobileBottomNav from '@/components/layout/MobileBottomNav';

const route = vi.hoisted(() => ({ pathname: '/feed' }));
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }));

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

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  route.pathname = '/feed';
  session.user = session.signedIn;
  session.hydrated = true;
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function renderRoute(pathname: string) {
  route.pathname = pathname;
  act(() => root.render(<MemoryRouter><MobileBottomNav profileHref="/profile/reader" /></MemoryRouter>));
}

it('can move between immersive and public routes without changing hook order', () => {
  renderRoute('/feed');
  expect(container.querySelector('a[aria-current="page"]')?.getAttribute('href')).toBe('/feed');
  for (const pathname of ['/editor/draft', '/contribute', '/write', '/dashboard/account']) {
    renderRoute(pathname);
    expect(container.querySelector('nav')).toBeNull();
    renderRoute('/library');
    expect(container.querySelector('a[aria-current="page"]')?.getAttribute('href')).toBe('/library');
  }
});

it('never renders for signed-out visitors or before the session hydrates', () => {
  session.user = null;
  renderRoute('/feed');
  expect(container.querySelector('nav')).toBeNull();

  session.user = session.signedIn;
  session.hydrated = false;
  renderRoute('/feed');
  expect(container.querySelector('nav')).toBeNull();
});

it('derives the selected destination on the first render and retains the profile link', () => {
  renderRoute('/assistant');
  expect(container.querySelector('a[aria-current="page"]')?.getAttribute('href')).toBe('/assistant');
  renderRoute('/profile/reader');
  expect(container.querySelector('a[aria-current="page"]')?.getAttribute('href')).toBe('/profile/reader');
});

const renderWithLibraryCount = (count: number | null | undefined) =>
  act(() =>
    root.render(
      <MemoryRouter>
        <MobileBottomNav profileHref="/profile/reader" newInLibrary={count} />
      </MemoryRouter>,
    ),
  );

it('signed-in with newInLibrary={3} renders a labelled library badge', () => {
  renderWithLibraryCount(3);
  const badge = container.querySelector('[role="img"][aria-label^="Library"]');
  expect(badge?.getAttribute('aria-label')).toBe('Library: 3 new since your last visit');
  expect(badge?.textContent).toBe('3');
});

it('newInLibrary caps the display at 99+', () => {
  renderWithLibraryCount(150);
  expect(container.querySelector('[role="img"][aria-label^="Library"]')?.textContent).toBe('99+');
});

it('0, null and undefined render no badge node at all', () => {
  for (const count of [0, null, undefined] as const) {
    renderWithLibraryCount(count);
    expect(container.querySelector('[role="img"][aria-label^="Library"]')).toBeNull();
  }
});
