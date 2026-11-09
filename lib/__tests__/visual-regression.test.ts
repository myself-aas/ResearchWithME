/**
 * Visual regression — markup/class snapshots of the stable component set.
 * Any unintended visual change fails the snapshot; update with
 * `vitest run -u` only after review (CI runs without -u).
 */
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import EvidenceCard from '@/components/scholarly/EvidenceCard';
import SourceCard from '@/components/scholarly/SourceCard';
import ClaimCard from '@/components/scholarly/ClaimCard';
import TrustAssessmentSummary from '@/components/scholarly/TrustAssessmentSummary';
import Citation from '@/components/scholarly/Citation';
import ReviewThread from '@/components/scholarly/ReviewThread';
import IntegrityNotice from '@/components/scholarly/IntegrityNotice';
import AIProvenanceDisclosure from '@/components/scholarly/AIProvenanceDisclosure';
import ProvenanceGraph from '@/components/graph/ProvenanceGraph';
import DataTable from '@/components/ui/DataTable';
import type { DataTableColumn, DataTableProps } from '@/components/ui/DataTable';
import Alert from '@/components/ui/Alert';
import EmptyState from '@/components/ui/EmptyState';
import type { Evidence, Source, SourceVersion, Claim, EvidenceAssessment, KnowledgeRelationship, DialogueItem, IntegrityEvent, AIValidation, AIProvenance } from '@/lib/schemas/scholarly';

const UUID = '018f2a6e-7c1d-7f3a-9b2c-4d5e6f708192';
const UUID2 = '018f2a6e-7c1d-7f3a-9b2c-4d5e6f708193';
const TS = '2026-11-09T12:00:00Z';
const base = {
  id: UUID, schemaVersion: '3.1' as const, objectVersion: 1, workspaceId: UUID2,
  lifecycle: 'active' as const, classification: 'public' as const,
  createdAt: TS, createdBy: UUID2, updatedAt: TS, updatedBy: UUID2,
};
const evidence: Evidence = { ...base, type: 'evidence', sourceVersionId: UUID2, locator: { kind: 'page', value: 'p. 42' }, statement: 'Effect size 0.31.', extractionType: 'extracted', assessment: 'supports' };
const source: Source = { ...base, type: 'source', title: 'A Study of X', language: 'en', sourceType: 'article', identifiers: [{ scheme: 'doi', value: '10.1000/xyz123', normalizedValue: '10.1000/xyz123', resolutionStatus: 'resolved' }], contributors: [{ name: 'A. Researcher' }], currentVersionId: UUID2, access: 'open' };
const sourceVersion: SourceVersion = { ...base, type: 'source-version', sourceId: UUID, versionLabel: '1', integrity: { retractionStatus: 'none' } };
const claim: Claim = { ...base, type: 'claim', text: 'X reduces Y.', claimType: 'observational', supportingEvidenceIds: [UUID2], contradictingEvidenceIds: [] };
const assessment: EvidenceAssessment = { review: 'peer-reviewed', replication: 'not-assessed', certainty: 'moderate', consensus: 'mixed', sourceIntegrity: 'active', assessedBy: UUID2, assessedAt: TS, method: 'checklist v2' };
const rel: KnowledgeRelationship = { ...base, type: 'relationship', label: 'supports', fromId: UUID, toId: UUID2, inferred: false };
const dialogue: DialogueItem = { id: UUID, type: 'comment', authorId: UUID2, createdAt: TS, body: 'Looks solid.' };
const integrity: IntegrityEvent = { id: UUID, at: TS, eventType: 'retraction', sourceId: UUID, sourceVersionId: UUID2, affectedObjectIds: [UUID2], recordedBy: UUID2 };
const provenance: AIProvenance = { provider: 'Gemini', model: 'gemini-3.8-flash', operation: 'summarize', sourceSet: [UUID2], generatedAt: TS, transformationType: 'extracted', citationValidation: 'passed', humanApproval: { reviewerId: UUID2, approvedAt: TS } };
const aiOk: AIValidation = { sourceResolution: 'resolved', citationEntailment: 'supports', quotationMatch: 'exact', sourceIntegrity: 'active', humanReview: 'approved', externalProcessing: 'approved-provider', reviewedBy: UUID2, reviewedAt: TS };

describe('visual regression snapshots', () => {
  it('EvidenceCard', () => {
    expect(renderToStaticMarkup(createElement(EvidenceCard, { evidence, source, sourceVersion, permissions: [] }))).toMatchSnapshot();
  });
  it('SourceCard', () => {
    expect(renderToStaticMarkup(createElement(SourceCard, { source, sourceVersion, permissions: [{ capability: 'read:source', granted: true }] }))).toMatchSnapshot();
  });
  it('ClaimCard', () => {
    expect(renderToStaticMarkup(createElement(ClaimCard, { claim, assessment: { ...assessment, evidenceCount: 2, contradictionCount: 0, lastRecomputedAt: TS }, permissions: [] }))).toMatchSnapshot();
  });
  it('TrustAssessmentSummary', () => {
    expect(renderToStaticMarkup(createElement(TrustAssessmentSummary, { assessment }))).toMatchSnapshot();
  });
  it('Citation', () => {
    const citationSource = { title: 'A Study of X', author: 'A. Researcher', year: '2026', journal: 'Journal of Examples', doi: '10.1000/xyz123' };
    expect(renderToStaticMarkup(createElement(Citation, { source: citationSource, internalId: UUID }))).toMatchSnapshot();
  });
  it('ReviewThread', () => {
    expect(renderToStaticMarkup(createElement(ReviewThread, { items: [dialogue], permissions: [], onAccept: () => {} }))).toMatchSnapshot();
  });
  it('IntegrityNotice', () => {
    expect(renderToStaticMarkup(createElement(IntegrityNotice, { event: integrity, affectedCount: 1, publicationBlocked: true }))).toMatchSnapshot();
  });
  it('AIProvenanceDisclosure', () => {
    expect(renderToStaticMarkup(createElement(AIProvenanceDisclosure, { provenance, validation: aiOk, permissions: [{ capability: 'ai:inspect', granted: true }], onInspect: () => {}, outputId: UUID }))).toMatchSnapshot();
  });
  it('ProvenanceGraph list mode', () => {
    expect(renderToStaticMarkup(createElement(ProvenanceGraph, {
      objects: [{ id: UUID, type: 'source', title: 'Paper A' }, { id: UUID2, type: 'claim', title: 'Claim X' }],
      relationships: [rel],
    }))).toMatchSnapshot();
  });
  it('DataTable', () => {
    type Row = { name: string; n?: number };
    const cols: Array<DataTableColumn<Row>> = [
      { key: 'name', header: 'Study', render: (r) => r.name },
      { key: 'n', header: 'N', unit: 'participants', numeric: true, render: (r) => r.n },
    ];
    const Table = DataTable as (p: DataTableProps<Row>) => React.ReactElement;
    expect(renderToStaticMarkup(createElement(Table, { columns: cols, rows: [{ name: 'A', n: 10 }, { name: 'B' }], caption: 'Studies' }))).toMatchSnapshot();
  });
  it('Alert tones + EmptyState', () => {
    expect(renderToStaticMarkup(createElement('div', null,
      createElement(Alert, { tone: 'info', title: 'Info' }, 'body'),
      createElement(Alert, { tone: 'error', title: 'Error' }, 'body'),
      createElement(EmptyState, { title: 'Nothing here' }, 'Add your first source.'),
    ))).toMatchSnapshot();
  });
});
