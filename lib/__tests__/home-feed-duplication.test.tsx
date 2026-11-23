// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HomeFeed from '@/components/HomeFeed';
import { makeTestArticle } from '../../test/fixtures/articles';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/lib/stores/preferences-store', () => {
  const state = {
    savedPostIds: [] as string[],
    likedPostIds: [] as string[],
    toggleSavedPost: vi.fn(),
    setPostLiked: vi.fn(),
  };
  return {
    usePreferencesStore: (selector: (value: typeof state) => unknown) => selector(state),
    useHydratePreferences: () => true,
  };
});

vi.mock('@/components/motion/MotionModeProvider', () => ({
  useMotionMode: () => ({ suppressed: true }),
}));

vi.mock('@/components/motion/Reveal', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/BlogHeader', () => ({ default: () => <div data-testid="header" /> }));
vi.mock('@/components/BlogFooter', () => ({ default: () => <div data-testid="footer" /> }));
vi.mock('@/components/BlogHero', () => ({ default: () => <div data-testid="hero" /> }));
vi.mock('@/components/FeaturedArticle', () => ({ default: () => <div data-testid="featured" /> }));
vi.mock('@/components/AuthorSpotlight', () => ({ default: () => <div data-testid="spotlight" /> }));
vi.mock('@/components/v34/ResearchNetworkBridge', () => ({
  ResearchNetworkBridge: () => <div data-testid="bridge" />,
}));
vi.mock('@/components/ArticleFeed', () => ({
  default: ({ posts, leadExcluded }: { posts: Array<{ id: string }>; leadExcluded?: boolean }) => (
    <div data-testid="feed" data-lead-excluded={String(Boolean(leadExcluded))}>
      {posts.map((post) => post.id).join(',')}
    </div>
  ),
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe('home feed duplication', () => {
  it('renders the lead story once: in the featured slot, not again in the index', async () => {
    const lead = makeTestArticle({ id: 'lead', slug: 'lead', title: 'The lead review', featured: true });
    const second = makeTestArticle({ id: 'second', slug: 'second', title: 'Another review', featured: false });

    await act(async () => {
      root.render(<HomeFeed initialPosts={[lead, second]} authors={[]} />);
    });

    expect(container.querySelector('[data-testid="featured"]')).not.toBeNull();
    const feed = container.querySelector('[data-testid="feed"]');
    expect(feed?.textContent).toBe('second');
    expect(feed?.getAttribute('data-lead-excluded')).toBe('true');
  });

  it('omits the list entirely when the lead slot holds the only post', async () => {
    const only = makeTestArticle({ id: 'only', slug: 'only', title: 'Only review', featured: false });

    await act(async () => {
      root.render(<HomeFeed initialPosts={[only]} authors={[]} />);
    });

    // `featuredPost ?? posts[0]` still fills the lead slot for a one-post site,
    // so the list is honestly empty rather than showing the same card twice.
    const feed = container.querySelector('[data-testid="feed"]');
    expect(feed?.textContent).toBe('');
    expect(feed?.getAttribute('data-lead-excluded')).toBe('true');
  });
});
