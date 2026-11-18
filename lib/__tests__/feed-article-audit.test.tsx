// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ResearchFeedClient from '@/components/v34/ResearchFeedClient';
import SaveToLibraryButton from '@/components/v34/SaveToLibraryButton';
import type { FeedItem } from '@/lib/v34/feed';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const item: FeedItem = {
  id: 'contrib-audit-1',
  kind: 'contribution',
  contributionType: 'paper-review',
  typeLabel: 'Paper review',
  title: 'A grounded paper review for the audit fixture',
  summary: 'A summary that keeps the audit fixture deterministic.',
  href: '/contribution/contrib-audit-1',
  authorName: 'Audit Author',
  authorHandle: 'audit-author',
  publishedAt: '2026-11-01',
  topics: ['Reasoning models'],
  tags: ['audit'],
  sourceTitle: 'The primary source behind the fixture',
  sourceHref: '/source/src-audit',
  sourceIntegrity: 'active',
  reviewState: 'editorially-reviewed',
  evidenceCount: 2,
  recognition: { helpfulReviews: 1, referenced: 2, saved: 3 },
};

let container: HTMLDivElement;
let root: Root;

async function render(node: ReactNode) {
  await act(async () => {
    root.render(node);
  });
}

function buttonByText(text: string) {
  return [...container.querySelectorAll('button')].find((node) => node.textContent?.trim() === text);
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.style.overflow = '';
  vi.unstubAllGlobals();
});

describe('research feed audit', () => {
  it('associates the filter fields with implicit labels, so the desktop rail and the sheet cannot duplicate ids', async () => {
    await render(<ResearchFeedClient initialItems={[item]} availableTopics={['Reasoning models']} sourceCount={1} />);

    const inputs = [...container.querySelectorAll<HTMLInputElement>('input[type="search"]')];
    expect(inputs).toHaveLength(1);
    expect(inputs[0].id).toBe('');
    expect(inputs[0].closest('label')).not.toBeNull();

    const select = container.querySelector('select');
    expect(select?.id).toBe('');
    expect(select?.closest('label')).not.toBeNull();
  });

  it('locks the page behind the mobile filter sheet and restores it on close', async () => {
    await render(<ResearchFeedClient initialItems={[item]} availableTopics={['Reasoning models']} sourceCount={1} />);

    await act(async () => {
      buttonByText('Filter feed')?.click();
    });
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.body.style.overflow).toBe('hidden');
    // Two copies are mounted (hidden desktop rail + sheet) but neither owns an id.
    expect(container.querySelectorAll('input[type="search"]')).toHaveLength(2);
    for (const input of container.querySelectorAll('input')) {
      expect(input.id).toBe('');
    }

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });

  it('labels the contribution-type button group', async () => {
    await render(<ResearchFeedClient initialItems={[item]} availableTopics={[]} sourceCount={1} />);
    const group = container.querySelector('[role="group"][aria-label="Contribution type"]');
    expect(group).not.toBeNull();
    expect(group?.querySelectorAll('button[aria-pressed]').length).toBeGreaterThan(1);
  });

  it('gives the standalone source link a 44px target and a truncation title', async () => {
    await render(<ResearchFeedClient initialItems={[item]} availableTopics={[]} sourceCount={1} />);
    const source = container.querySelector<HTMLAnchorElement>('a[title="The primary source behind the fixture"]');
    expect(source).not.toBeNull();
    expect(source?.className).toContain('min-h-11');
  });

  it('distinguishes an empty network from an empty filter result', async () => {
    await render(<ResearchFeedClient initialItems={[]} availableTopics={[]} sourceCount={0} />);
    expect(container.textContent).toContain('No contributions published yet');
    expect(container.textContent).not.toContain('No matching contributions yet');

    await render(<ResearchFeedClient initialItems={[item]} availableTopics={[]} sourceCount={1} />);
    const input = container.querySelector('input[type="search"]') as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'zzz');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(container.textContent).toContain('No matching contributions yet');
    expect(container.textContent).not.toContain('No contributions published yet');
  });

  it('explains a save attempt that the account gate refuses', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    vi.stubGlobal('fetch', fetchMock);
    await render(
      <SaveToLibraryButton itemType="article" itemId="audit-1" title="Audit" url="/post/audit" />
    );

    await act(async () => {
      buttonByText('Save')?.click();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const status = container.querySelector('[role="status"]');
    expect(status?.textContent).toBe('Sign in to save items to your library.');
    expect(status?.className).not.toContain('sr-only');
  });

  it('explains a save attempt that never reached the server', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await render(
      <SaveToLibraryButton itemType="article" itemId="audit-1" title="Audit" url="/post/audit" />
    );

    await act(async () => {
      buttonByText('Save')?.click();
    });
    expect(container.querySelector('[role="status"]')?.textContent).toContain('Check your connection');
  });
});
