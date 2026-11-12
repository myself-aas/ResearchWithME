import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  validateDialogueItem,
  validateAIValidation,
  publicationBlockers,
  type DialogueItem,
  type AIProvenance,
  type AIValidation,
  type IntegrityEvent,
  type KnowledgeRelationship,
} from '@/lib/schemas/scholarly';
import { dialogueView, sortThread } from '@/lib/scholarly/dialogue';
import { disclosureView } from '@/lib/scholarly/ai-provenance';
import { graphEdges, graphListRows, graphNodes } from '@/lib/scholarly/graph';
import ReviewThread from '@/components/scholarly/ReviewThread';
import IntegrityNotice from '@/components/scholarly/IntegrityNotice';
import AIProvenanceDisclosure from '@/components/scholarly/AIProvenanceDisclosure';
import ProvenanceGraph from '@/components/graph/ProvenanceGraph';

const UUID = '018f2a6e-7c1d-7f3a-9b2c-4d5e6f708192';
const UUID2 = '018f2a6e-7c1d-7f3a-9b2c-4d5e6f708193';
const UUID3 = '018f2a6e-7c1d-7f3a-9b2c-4d5e6f708194';
const TS = '2026-11-09T12:00:00Z';
const TS2 = '2026-11-10T12:00:00Z';

const item = (over: Partial<DialogueItem>): DialogueItem => ({
  id: UUID,
  type: 'comment',
  authorId: UUID2,
  createdAt: TS,
  body: 'Looks good.',
  ...over,
});

describe('scholarly dialogue (§7)', () => {
  it('validator: rebuttal must link review items; decision must record rationale', () => {
    expect(validateDialogueItem(item({ type: 'rebuttal', reviewItemIds: [] })).ok).toBe(false);
    expect(validateDialogueItem(item({ type: 'rebuttal', reviewItemIds: [UUID3] })).ok).toBe(true);
    expect(validateDialogueItem(item({ type: 'decision', rationale: '' })).ok).toBe(false);
    expect(validateDialogueItem(item({ type: 'decision', rationale: 'consensus reached', status: 'resolved' })).ok).toBe(true);
  });

  it('anonymity: anonymous reviewers are labeled without exposing authorId (§24)', () => {
    const v = dialogueView(item({ anonymous: true, type: 'review' }));
    expect(v.authorLabel).toBe('Anonymous reviewer');
    expect(v.authorLabel).not.toContain(UUID2);
  });

  it('thread sorts chronologically and renders item types with labels', () => {
    const items = [item({ id: UUID2, createdAt: TS2, body: 'later' }), item({ id: UUID, createdAt: TS, body: 'first' })];
    expect(sortThread(items).map((i) => i.body)).toEqual(['first', 'later']);
    const html = renderToStaticMarkup(
      createElement(ReviewThread, {
        items: [item({ type: 'suggestion', status: 'open' }), item({ id: UUID2, type: 'decision', status: 'resolved', rationale: 'agreed', createdAt: TS2 })],
        permissions: [{ capability: 'suggestion:accept', granted: true }],
        onAccept: () => {},
      }),
    );
    expect(html).toContain('Suggestion');
    expect(html).toContain('Decision');
    expect(html).toContain('Rationale: agreed');
    expect(html).toContain('>Accept<');
  });

  it('capability denied → no accept button', () => {
    const html = renderToStaticMarkup(
      createElement(ReviewThread, { items: [item({ type: 'suggestion' })], permissions: [], onAccept: () => {} }),
    );
    expect(html).not.toContain('>Accept<');
  });
});

describe('integrity notice (§25)', () => {
  const event: IntegrityEvent = {
    id: UUID, at: TS, eventType: 'retraction', sourceId: UUID, sourceVersionId: UUID2,
    affectedObjectIds: [UUID3], recordedBy: UUID2,
  };

  it('retraction uses role="alert" and states preservation + block', () => {
    const html = renderToStaticMarkup(createElement(IntegrityNotice, { event, affectedCount: 3, publicationBlocked: true }));
    expect(html).toContain('role="alert"');
    expect(html).toContain('original version preserved');
    expect(html).toContain('3 dependent object(s) marked for review');
    expect(html).toContain('Publication is blocked');
  });
});

describe('AI provenance disclosure (§26)', () => {
  const provenance: AIProvenance = {
    provider: 'Gemini', model: 'gemini-3.8-flash', operation: 'summarize', sourceSet: [UUID2],
    generatedAt: TS, transformationType: 'extracted', citationValidation: 'passed',
    humanApproval: { reviewerId: UUID2, approvedAt: TS },
  };
  const okValidation: AIValidation = {
    sourceResolution: 'resolved', citationEntailment: 'supports', quotationMatch: 'exact',
    sourceIntegrity: 'active', humanReview: 'approved', externalProcessing: 'approved-provider',
    reviewedBy: UUID2, reviewedAt: TS,
  };

  it('publication blockers fire for each §26 condition', () => {
    expect(publicationBlockers(okValidation)).toEqual([]);
    expect(publicationBlockers({ ...okValidation, sourceResolution: 'unresolved' })).toContain('Required sources are unresolved');
    expect(publicationBlockers({ ...okValidation, quotationMatch: 'mismatch' })).toContain('Quotation does not match the source');
    expect(publicationBlockers({ ...okValidation, citationEntailment: 'does-not-support' })).toContain('Citation does not support the claim');
    expect(publicationBlockers({ ...okValidation, humanReview: 'not-reviewed' })).toContain('Human review is missing or not approved');
    expect(publicationBlockers({ ...okValidation, externalProcessing: 'prohibited' })).toContain('External AI processing violates the data-classification policy');
    expect(publicationBlockers(okValidation, true)).toContain('Retraction impact is unresolved');
    expect(validateAIValidation(okValidation).ok).toBe(true);
    expect(validateAIValidation({ ...okValidation, humanReview: 'maybe' }).ok).toBe(false);
  });

  it('disclosure renders rows, approval, and blockers; pending review blocks publication', () => {
    const pending: AIProvenance = { ...provenance, humanApproval: null };
    const view = disclosureView(pending, { ...okValidation, humanReview: 'not-reviewed' });
    expect(view.approvalLabel).toContain('publication blocked');
    expect(view.blockers.length).toBeGreaterThan(0);
    const html = renderToStaticMarkup(
      createElement(AIProvenanceDisclosure, {
        provenance: pending, validation: { ...okValidation, humanReview: 'not-reviewed' },
        permissions: [{ capability: 'ai:inspect', granted: true }], onInspect: () => {}, outputId: UUID,
      }),
    );
    expect(html).toContain('AI-assisted content');
    expect(html).toContain('Gemini gemini-3.8-flash');
    expect(html).toContain('Publication blocked');
    expect(html).toContain('>Inspect<');
  });
});

describe('provenance graph (§27.5)', () => {
  const rel = (over: Partial<KnowledgeRelationship>): KnowledgeRelationship => ({
    id: UUID, type: 'relationship', schemaVersion: '3.1', objectVersion: 1, workspaceId: UUID2,
    lifecycle: 'active', classification: 'public', createdAt: TS, createdBy: UUID2, updatedAt: TS, updatedBy: UUID2,
    label: 'supports', fromId: UUID, toId: UUID2, inferred: false, ...over,
  });
  const objects = [
    { id: UUID, type: 'source' as const, title: 'Paper A' },
    { id: UUID2, type: 'claim' as const, title: 'Claim X' },
  ];

  it('every edge is labeled; inferred edges are dashed AND explained', () => {
    const edges = graphEdges([rel({}), rel({ id: UUID3, label: 'derives-from', inferred: true, explanation: 'via shared method' })]);
    expect(edges[0].label).toBe('supports');
    expect(edges[0].lineClass).toBe(''); // solid is the SVG default
    expect(edges[1].label).toBe('derives from');
    expect(edges[1].lineClass).toBe('[stroke-dasharray:4]');
    expect(edges[1].explanation).toBeTruthy();
  });

  it('list alternative rows carry the same information as the graph', () => {
    const rows = graphListRows([rel({})], (id) => objects.find((o) => o.id === id)?.title ?? id);
    expect(rows).toEqual([{ subject: 'Paper A', relationship: 'supports', object: 'Claim X', note: undefined }]);
  });

  it('renders list mode by default with keyboard-navigable nodes and an equivalent table', () => {
    const html = renderToStaticMarkup(createElement(ProvenanceGraph, { objects, relationships: [rel({})] }));
    expect(html).toContain('aria-label="Knowledge objects"');
    expect(html).toContain('aria-label="source: Paper A"');
    expect(html).toContain('aria-label="claim: Claim X"');
    expect(html).toContain('<table');
    expect(html).toContain('supports');
    expect(html).toContain('tabindex="0"');
    expect(graphNodes(objects).map((n) => n.nodeClass)).toContain('text-graph-node-source');
  });
});
