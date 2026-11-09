import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { revalidateAnchor, anchorChecksum, resolveConflict } from '@/lib/scholarly/annotations';
import { validateAnnotation, validateConflictResolution } from '@/lib/schemas/annotations';
import AnnotationMarker from '@/components/editor/AnnotationMarker';
import ConflictPanel from '@/components/editor/ConflictPanel';
import type { AnnotationAnchor } from '@/lib/schemas/annotations';

const V = '018f2a6e-7c1d-7f3a-9b2c-4d5e6f708192';
const U = '018f2a6e-7c1d-7f3a-9b2c-4d5e6f708193';
const TS = '2026-11-09T12:00:00Z';

const anchor: AnnotationAnchor = {
  sourceVersionId: V,
  structuralPath: 'body > p:nth(3)',
  textQuote: { exact: 'replication was not attempted', prefix: 'we note that ', suffix: ' in this cohort' },
  position: { start: 100, end: 127 },
};

describe('§29 anchor revalidation — never silently relocated', () => {
  it('valid when the exact quote is present', () => {
    expect(revalidateAnchor(anchor, { sourceVersionId: V, text: 'we note that replication was not attempted in this cohort.' })).toBe('valid');
  });
  it('drifted when the quote is gone but context survives', () => {
    expect(revalidateAnchor(anchor, { sourceVersionId: V, text: 'we note that something else happened in this cohort.' })).toBe('drifted');
  });
  it('unresolved when nothing identifiable remains, and on version mismatch', () => {
    expect(revalidateAnchor(anchor, { sourceVersionId: V, text: 'completely rewritten text' })).toBe('unresolved');
    expect(revalidateAnchor(anchor, { sourceVersionId: U, text: 'replication was not attempted' })).toBe('unresolved');
  });
  it('checksum is stable and slice-sensitive', () => {
    const t = 'abcdefghijklmnopqrstuvwxyz';
    expect(anchorChecksum(t, 0, 5)).toBe(anchorChecksum(t, 0, 5));
    expect(anchorChecksum(t, 0, 5)).not.toBe(anchorChecksum(t, 1, 6));
  });
});

describe('§34 conflict resolution — both versions preserved, rationale required', () => {
  const a = { label: 'local', values: { title: 'Local title', n: 10 }, capturedAt: TS, authorId: U };
  const b = { label: 'remote', values: { title: 'Remote title', n: 12 }, capturedAt: TS, authorId: U };

  it('resolveConflict keeps both sides and requires rationale', () => {
    const r = resolveConflict(a, b, { title: 'Remote title' }, 'remote is newer');
    expect(r.sides.map((s) => s.label)).toEqual(['local', 'remote']);
    expect(r.selected.title).toBe('Remote title');
    expect(() => resolveConflict(a, b, { title: 'x' }, '  ')).toThrow(/rationale/);
    expect(() => resolveConflict(a, b, { bogus: 1 }, 'reason')).toThrow(/neither side/);
  });

  it('schemas validate annotation and conflict records', () => {
    const annR = validateAnnotation({
      id: V, workspaceId: U, anchor, anchorState: 'drifted', body: 'note', kind: 'comment', authorId: U, createdAt: TS, updatedAt: TS,
    });
    expect(annR.ok && annR.value.anchorState).toBe('drifted');
    const cr = validateConflictResolution({
      id: V, objectId: U,
      sides: [a, b],
      selected: { title: 'Remote title' },
      rationale: 'newer', resolvedBy: U, resolvedAt: TS,
    });
    expect(cr.ok && cr.value.sides).toHaveLength(2);
  });
});

describe('editor components render states accessibly', () => {
  it('AnnotationMarker marks unresolved anchors with the original quote', () => {
    const annR = validateAnnotation({
      id: V, workspaceId: U, anchor, anchorState: 'unresolved', body: 'Please verify.', kind: 'comment', authorId: U, createdAt: TS, updatedAt: TS,
    });
    if (!annR.ok) throw new Error(annR.errors.join('; '));
    const html = renderToStaticMarkup(createElement(AnnotationMarker, { annotation: annR.value }));
    expect(html).toContain('Anchor unresolved');
    expect(html).toContain('replication was not attempted');
    expect(html).toContain('aria-describedby');
  });

  it('ConflictPanel requires rationale and disables resolve until provided', () => {
    const a = { label: 'local', values: { title: 'A' }, capturedAt: TS, authorId: U };
    const b = { label: 'remote', values: { title: 'B' }, capturedAt: TS, authorId: U };
    const html = renderToStaticMarkup(createElement(ConflictPanel, { sides: [a, b], onResolve: () => {} }));
    expect(html).toContain('both versions preserved');
    expect(html).toContain('disabled=""');
    expect(html).toContain('Rationale (required)');
  });
});
