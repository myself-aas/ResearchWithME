import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import DashboardProfileHeader from '@/components/dashboard/DashboardProfileHeader';
import type { DashboardProfileSummary } from '@/lib/dashboard/profile';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element -- test double for next/image
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const summary = (overrides: Partial<DashboardProfileSummary> = {}): DashboardProfileSummary => ({
  displayName: 'Ashif Ahmed Shuvo',
  role: 'Editor-in-Chief',
  bio: 'I review evidence on public-health interventions.',
  domain: 'Public health',
  institution: 'ResearchWithME',
  avatarUrl: null,
  joinedYear: '2024',
  hasProfile: true,
  counts: null,
  ...overrides,
});

const textOf = (html: string) => html.replace(/<!-- -->/g, '').replace(/<[^>]*>/g, '');

function render(overrides: Partial<DashboardProfileSummary> = {}) {
  return renderToStaticMarkup(
    createElement(DashboardProfileHeader, {
      profile: summary(overrides),
      isEditor: true,
      isEditorInChief: true,
      signingOut: false,
      signOutError: null,
      onSignOut: () => {},
    }),
  );
}

describe('DashboardProfileHeader', () => {
  it('sends "Edit profile" to the profile editor, not a dead route', () => {
    const html = render();
    expect(html).toContain('href="/dashboard/profile"');
    expect(html).not.toContain('href="/settings"');
    expect(html).toContain('Edit profile');
  });

  it('renders real counters when the aggregate was read', () => {
    const html = render({
      counts: { followers: 3, savesReceived: 12, publishedReviews: 4 },
    });
    expect(html).toContain('aria-label="Profile activity"');
    const text = textOf(html);
    expect(text).toContain('3 followers');
    expect(text).toContain('12 saves of your work');
    expect(text).toContain('4 published reviews');
  });

  it('shows a real zero instead of hiding a measured zero', () => {
    const html = render({ counts: { followers: 0, savesReceived: 0, publishedReviews: 0 } });
    expect(html).toContain('aria-label="Profile activity"');
    const text = textOf(html);
    expect(text).toContain('0 followers');
    expect(text).toContain('0 saves of your work');
  });

  it('omits the stat strip when the aggregate could not be read', () => {
    const html = render({ counts: null });
    expect(html).not.toContain('aria-label="Profile activity"');
    expect(html).not.toContain('followers');
  });
});
