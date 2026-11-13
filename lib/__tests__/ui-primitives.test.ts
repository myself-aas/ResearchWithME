import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Dialog from '@/components/ui/Dialog';
import Alert from '@/components/ui/Alert';
import { Toast, ToastRegion } from '@/components/ui/Toast';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';

describe('Dialog primitive', () => {
  it('renders nothing when closed', () => {
    const html = renderToStaticMarkup(createElement(Dialog, { open: false, onClose: () => {}, title: 'T' }));
    expect(html).toBe('');
  });

  it('exposes dialog semantics, modal flag, and labelledby when open', () => {
    const html = renderToStaticMarkup(
      createElement(Dialog, { open: true, onClose: () => {}, title: 'Delete draft', description: 'This cannot be undone' }, createElement('p', null, 'body')),
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="reme-dialog-title"');
    expect(html).toContain('aria-describedby="reme-dialog-desc"');
    expect(html).toContain('Delete draft');
    expect(html).toContain('shadow-dialog');
  });
});

describe('Alert primitive', () => {
  it('uses role="alert" for errors and pairs tone with a text label (never color alone)', () => {
    const html = renderToStaticMarkup(createElement(Alert, { tone: 'error', title: 'Publication blocked' }, 'Unresolved sources'));
    expect(html).toContain('role="alert"');
    expect(html).toContain('Error');
    expect(html).toContain('Publication blocked');
  });

  it('uses role="status" for non-error tones', () => {
    const html = renderToStaticMarkup(createElement(Alert, { tone: 'success', title: 'Saved' }));
    expect(html).toContain('role="status"');
    expect(html).toContain('Verified');
  });
});

describe('Toast primitives', () => {
  it('renders a polite live region and role="status" toasts', () => {
    const html = renderToStaticMarkup(
      createElement(ToastRegion, { toasts: [{ id: '1', message: 'Saved', tone: 'success' }] }),
    );
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-label="Notifications"');
    expect(html).toContain('role="status"');
    expect(html).toContain('Saved');
  });

  it('Toast renders its message', () => {
    const html = renderToStaticMarkup(createElement(Toast, { message: 'Copied with citation' }));
    expect(html).toContain('Copied with citation');
    expect(html).toContain('role="status"');
  });
});

describe('Skeleton and EmptyState primitives', () => {
  it('Skeleton is aria-hidden and renders the requested line count', () => {
    const html = renderToStaticMarkup(createElement(Skeleton, { lines: 3 }));
    expect(html).toContain('aria-hidden="true"');
    expect((html.match(/animate-pulse/g) ?? []).length).toBe(3);
  });

  it('EmptyState explains the empty view and offers one action', () => {
    const html = renderToStaticMarkup(
      createElement(EmptyState, { title: 'No evidence yet', action: createElement('button', null, 'Add evidence') }, 'Nothing has been extracted from this source.'),
    );
    expect(html).toContain('No evidence yet');
    expect(html).toContain('Nothing has been extracted from this source.');
    expect(html).toContain('Add evidence');
  });
});
