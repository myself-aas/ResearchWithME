// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ReadingStreak from '@/components/engagement/ReadingStreak';
import GoalRing from '@/components/engagement/GoalRing';

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
let reducedMotion = false;

beforeEach(() => {
  reducedMotion = false;
  session.user = session.signedIn;
  session.hydrated = true;
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: reducedMotion && query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

const today = '2026-11-23';
const render = (element: React.ReactElement) => act(() => root.render(element));

it('signed-out visitors never see the chrome', () => {
  session.user = null;
  render(<ReadingStreak events={[{ day: today }]} today={today} />);
  expect(container.innerHTML).toBe('');
});

it('hides until the session hydrates (no pre-hydration flash)', () => {
  session.hydrated = false;
  render(<ReadingStreak events={[{ day: today }]} today={today} />);
  expect(container.innerHTML).toBe('');
});

it('zero events shows 0 and the honest first-review prompt', () => {
  render(<ReadingStreak events={[]} today={today} />);
  expect(container.textContent).toContain('0 days reading streak');
  expect(container.textContent).toContain('first review');
  expect(container.querySelector('[role="status"]')?.getAttribute('aria-label')).toBe('Reading streak: 0 days');
});

it('a 4-day streak is announced truthfully', () => {
  const events = [
    { day: '2026-11-20' }, { day: '2026-11-21' }, { day: '2026-11-22' }, { day: '2026-11-23' },
  ];
  render(<ReadingStreak events={events} today={today} />);
  expect(container.querySelector('[role="status"]')?.getAttribute('aria-label')).toBe('Reading streak: 4 days');
  expect(container.textContent).toContain('4 days reading streak');
});

it('a gap yesterday with events before it reads as 0 (never inflated)', () => {
  const events = [{ day: '2026-11-20' }, { day: '2026-11-21' }];
  render(<ReadingStreak events={events} today={today} />);
  expect(container.querySelector('[role="status"]')?.getAttribute('aria-label')).toBe('Reading streak: 0 days');
  expect(container.textContent).toContain('paused');
});

it('data-reduced="true" under reduced motion and renders no animation loop', () => {
  reducedMotion = true;
  const events = [{ day: today }];
  render(<ReadingStreak events={events} today={today} />);
  expect(container.querySelector('[data-reduced="true"]')).not.toBeNull();
  expect(container.innerHTML).not.toContain('animate-');
  expect(container.innerHTML).not.toContain('loop');
});

it('with goalDays it renders a labelled goal ring capped at the target', () => {
  const events = [
    { day: '2026-11-20' }, { day: '2026-11-21' }, { day: '2026-11-22' }, { day: '2026-11-23' },
  ];
  render(<ReadingStreak events={events} today={today} goalDays={3} />);
  const ring = container.querySelector('[role="progressbar"]');
  expect(ring?.getAttribute('aria-valuenow')).toBe('3');
  expect(ring?.getAttribute('aria-valuemax')).toBe('3');
});

it('GoalRing 3/10 reports aria-valuenow=3 and a centered text anchor', () => {
  render(<GoalRing completed={3} target={10} label="Reading goal" />);
  const ring = container.querySelector('[role="progressbar"]');
  expect(ring?.getAttribute('aria-valuenow')).toBe('3');
  expect(ring?.getAttribute('aria-valuemax')).toBe('10');
  expect(ring?.getAttribute('aria-valuemin')).toBe('0');
  expect(ring?.getAttribute('aria-label')).toBe('Reading goal');
  expect(container.querySelector('text')?.textContent).toBe('3/10');
});

it('GoalRing clamps over-complete values instead of drawing past 100%', () => {
  render(<GoalRing completed={12} target={10} />);
  expect(container.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('10');
});

it('GoalRing renders nothing when target <= 0 (no phantom goal)', () => {
  render(<GoalRing completed={0} target={0} />);
  expect(container.innerHTML).toBe('');
});
