import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Alert from '@/components/ui/Alert';
import Dialog from '@/components/ui/Dialog';
import DataTable, { NOT_REPORTED, type DataTableColumn } from '@/components/ui/DataTable';
import EmptyState from '@/components/ui/EmptyState';
import RouteSkeleton from '@/components/ui/RouteSkeleton';
import Skeleton from '@/components/ui/Skeleton';
import { Toast, ToastRegion } from '@/components/ui/Toast';
import { Button } from '@/components/primitives';

/**
 * Five-state contract (DESIGN.md §Component state contract) pinned on the
 * composites: loading mirrors final layout; empty explains why + one relevant
 * action; error names the problem + recovery; disabled explains how to enable;
 * success is explicit; status is never color-only.
 *
 * Where a composite has no such state by design (Skeleton has no "error"
 * variant — it is decorative and aria-hidden), the test asserts the documented
 * contract instead of inventing a state.
 */

const focusableCount = (html: string) =>
  (html.match(/<button[\s>]/g) ?? []).length + (html.match(/<a[\s][^>]*href=/g) ?? []).length;

describe('Alert — all tones announce, with text (never color-only)', () => {
  for (const tone of ['info', 'success', 'warning', 'error'] as const) {
    it(`tone=${tone} renders non-empty text, a visible tone label, and role=${tone === 'error' ? 'alert' : 'status'}`, () => {
      const html = renderToStaticMarkup(<Alert tone={tone} title="Draft saved">Details here</Alert>);
      expect(html).toContain(tone === 'error' ? 'role="alert"' : 'role="status"');
      expect(html).toContain('Draft saved');
      expect(html).toContain('Details here');
      for (const label of ['Notice', 'Verified', 'Caution', 'Error']) {
        if (tone === 'info' && label === 'Notice') expect(html).toContain('Notice');
        if (tone === 'success' && label === 'Verified') expect(html).toContain('Verified');
        if (tone === 'warning' && label === 'Caution') expect(html).toContain('Caution');
        if (tone === 'error' && label === 'Error') expect(html).toContain('Error');
      }
    });
  }
});

describe('EmptyState — explains why + at most one action', () => {
  it('renders the title and explanation; without an action it has zero focusables', () => {
    const html = renderToStaticMarkup(<EmptyState title="No evidence yet">Attach a source to see it here.</EmptyState>);
    expect(html).toContain('No evidence yet');
    expect(html).toContain('Attach a source to see it here.');
    expect(focusableCount(html)).toBe(0);
  });

  it('with an action it renders exactly one focusable primary action', () => {
    const html = renderToStaticMarkup(
      <EmptyState title="No evidence yet" action={<Button>Add source</Button>}>
        Attach a source to see it here.
      </EmptyState>,
    );
    expect(html).toContain('Add source');
    expect(focusableCount(html)).toBe(1);
  });
});

describe('Toast — transient, never focusable, always role="status"', () => {
  for (const tone of ['info', 'success', 'error'] as const) {
    it(`tone=${tone} renders role="status" with non-empty message and no focusables`, () => {
      const html = renderToStaticMarkup(<Toast message="Copied with citation" tone={tone} duration={0} />);
      expect(html).toContain('role="status"');
      expect(html).toContain('Copied with citation');
      expect(focusableCount(html)).toBe(0);
    });
  }

  it('region is an aria-live=polite labelled landmark', () => {
    const html = renderToStaticMarkup(
      <ToastRegion toasts={[{ id: '1', message: 'Saved', tone: 'success' }]} />,
    );
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-label="Notifications"');
    expect(html).toContain('role="status"');
  });
});

describe('Skeleton — decorative blocks, announced by the surrounding surface', () => {
  it('renders the requested number of aria-hidden lines', () => {
    const html = renderToStaticMarkup(<Skeleton lines={3} />);
    expect(html).toContain('aria-hidden="true"');
    expect((html.match(/animate-pulse/g) ?? []).length).toBe(3);
  });
});

describe('RouteSkeleton — every variant is a labelled status with aria-busy', () => {
  for (const variant of ['article', 'archive', 'profile'] as const) {
    it(`variant=${variant} has role="status", aria-busy, and a non-empty accessible name`, () => {
      const html = renderToStaticMarkup(<RouteSkeleton variant={variant} label="Loading the page" />);
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain('Loading the page');
      expect(html.length).toBeGreaterThan(200);
    });
  }
});

describe('DataTable — empty state explains, missing values are never zero', () => {
  const columns: Array<DataTableColumn<{ id: string; n: number | null }>> = [
    { key: 'id', header: 'Record', render: (r) => r.id },
    { key: 'n', header: 'Measure', unit: 'ms', numeric: true, render: (r) => (r.n === null ? null : String(r.n)) as ReactNode },
  ];

  it('empty rows render the non-empty empty label, not a bare table', () => {
    const html = renderToStaticMarkup(<DataTable columns={columns} rows={[]} caption="Benchmarks" emptyLabel="No benchmark rows" />);
    expect(html).toContain('No benchmark rows');
    expect(html).not.toContain('<table');
  });

  it('a missing numeric renders "Not reported", never 0', () => {
    const html = renderToStaticMarkup(
      <DataTable columns={columns} rows={[{ id: 'r1', n: null }]} caption="Benchmarks" />,
    );
    expect(html).toContain(NOT_REPORTED);
    expect(html).not.toMatch(/<td[^>]*>\s*0\s*<\/td>/);
    expect(html).toContain('Benchmarks');
    expect(html).toContain('(ms)');
  });
});

describe('Dialog — modal semantics when open, nothing when closed', () => {
  it('closed renders nothing', () => {
    expect(renderToStaticMarkup(<Dialog open={false} onClose={() => {}} title="Title" />)).toBe('');
  });

  it('open renders role="dialog", aria-modal, labelledby and non-empty text', () => {
    const html = renderToStaticMarkup(
      <Dialog open={true} onClose={() => {}} title="Delete draft" description="This cannot be undone" />,
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="reme-dialog-title"');
    expect(html).toContain('Delete draft');
  });
});

describe('Button — disabled and loading states are explicit', () => {
  it('disabled renders a natively disabled control (not a fake)', () => {
    const html = renderToStaticMarkup(<Button disabled>Save</Button>);
    expect(html).toContain('disabled');
    expect(html).toContain('Save');
  });

  it('loading disables the control, sets aria-busy and keeps the label announced', () => {
    const html = renderToStaticMarkup(<Button loading>Save</Button>);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('disabled');
    expect(html).toContain('Save');
  });
});
