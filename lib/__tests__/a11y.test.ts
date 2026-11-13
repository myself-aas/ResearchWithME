// @vitest-environment jsdom
/**
 * Automated accessibility tests — reme v3.1 §4/§17: axe-core against the
 * rendered markup of the scholarly components (WCAG 2.2 AA target; axe
 * reports 2.1 A/AA rules, which is the enforced subset here).
 */
import { describe, expect, it, beforeAll } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import axe from 'axe-core';
import EvidenceCard from '@/components/scholarly/EvidenceCard';
import SourceCard from '@/components/scholarly/SourceCard';
import ClaimCard from '@/components/scholarly/ClaimCard';
import TrustAssessmentSummary from '@/components/scholarly/TrustAssessmentSummary';
import ProvenanceGraph from '@/components/graph/ProvenanceGraph';
import DataTable, { type DataTableColumn, type DataTableProps } from '@/components/ui/DataTable';
type Row = { name: string; n?: number };
const Table = DataTable as (props: DataTableProps<Row>) => React.ReactElement;
import Alert from '@/components/ui/Alert';
import EmptyState from '@/components/ui/EmptyState';
import type { Evidence, Source, SourceVersion, Claim, EvidenceAssessment, KnowledgeRelationship } from '@/lib/schemas/scholarly';

const UUID = '018f2a6e-7c1d-7f3a-9b2c-4d5e6f708192';
const UUID2 = '018f2a6e-7c1d-7f3a-9b2c-4d5e6f708193';
const TS = '2026-11-09T12:00:00Z';

const base = {
  id: UUID, schemaVersion: '3.1' as const, objectVersion: 1, workspaceId: UUID2,
  lifecycle: 'active' as const, classification: 'public' as const,
  createdAt: TS, createdBy: UUID2, updatedAt: TS, updatedBy: UUID2,
};

const evidence: Evidence = {
  ...base, type: 'evidence', sourceVersionId: UUID2,
  locator: { kind: 'page', value: 'p. 42' }, statement: 'Effect size 0.31 (95% CI 0.12–0.50).',
  extractionType: 'extracted', assessment: 'supports',
};
const source: Source = {
  ...base, type: 'source', title: 'A Study of X', language: 'en', sourceType: 'article',
  identifiers: [{ scheme: 'doi', value: '10.1000/xyz123', normalizedValue: '10.1000/xyz123', resolutionStatus: 'resolved' }],
  contributors: [{ name: 'A. Researcher' }], currentVersionId: UUID2, access: 'open',
};
const sourceVersion: SourceVersion = { ...base, type: 'source-version', sourceId: UUID, versionLabel: '1', integrity: { retractionStatus: 'none' } };
const claim: Claim = { ...base, type: 'claim', text: 'X reduces Y.', claimType: 'observational', supportingEvidenceIds: [UUID2], contradictingEvidenceIds: [] };
const assessment: EvidenceAssessment = {
  review: 'peer-reviewed', replication: 'not-assessed', certainty: 'moderate', consensus: 'mixed',
  sourceIntegrity: 'active', assessedBy: UUID2, assessedAt: TS, method: 'checklist v2',
};
const rel: KnowledgeRelationship = { ...base, type: 'relationship', label: 'supports', fromId: UUID, toId: UUID2, inferred: false };

let document_: Document;

beforeAll(() => {
  document_ = document;
});

async function axeOn(component: React.ReactElement): Promise<axe.AxeResults> {
  const html = renderToStaticMarkup(component);
  document_.body.innerHTML = `<main>${html}</main>`;
  return axe.run(document_.body, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
}

describe('axe-core WCAG A/AA on scholarly components', () => {
  it('EvidenceCard has no violations', async () => {
    const r = await axeOn(createElement(EvidenceCard, { evidence, source, sourceVersion, permissions: [] }));
    expect(r.violations).toEqual([]);
  });

  it('SourceCard has no violations', async () => {
    const r = await axeOn(createElement(SourceCard, { source, sourceVersion, permissions: [{ capability: 'read:source', granted: true }] }));
    expect(r.violations).toEqual([]);
  });

  it('ClaimCard with trust summary has no violations', async () => {
    const r = await axeOn(createElement(ClaimCard, {
      claim, assessment: { ...assessment, evidenceCount: 4, contradictionCount: 0, lastRecomputedAt: TS }, permissions: [],
    }));
    expect(r.violations).toEqual([]);
  });

  it('TrustAssessmentSummary alone has no violations', async () => {
    const r = await axeOn(createElement(TrustAssessmentSummary, { assessment }));
    expect(r.violations).toEqual([]);
  });

  it('ProvenanceGraph list mode has no violations', async () => {
    const r = await axeOn(createElement(ProvenanceGraph, {
      objects: [{ id: UUID, type: 'source', title: 'Paper A' }, { id: UUID2, type: 'claim', title: 'Claim X' }],
      relationships: [rel],
    }));
    expect(r.violations).toEqual([]);
  });

  it('DataTable renders missing values as "Not reported", never zero', async () => {
    const cols: Array<DataTableColumn<{ name: string; n?: number }>> = [
      { key: 'name', header: 'Study', render: (r: { name: string }) => r.name },
      { key: 'n', header: 'Sample size', unit: 'participants', numeric: true, render: (r: { n?: number }) => r.n },
    ];
    const html = renderToStaticMarkup(createElement(Table, { columns: cols, rows: [{ name: 'A' }, { name: 'B', n: 120 }], caption: 'Studies' }));
    expect(html).toContain('Not reported');
    expect(html).not.toMatch(/>0</);
    const r = await axeOn(createElement(Table, { columns: cols, rows: [{ name: 'A', n: 5 }], caption: 'Studies' }));
    expect(r.violations).toEqual([]);
  });

  it('Alert and EmptyState have no violations', async () => {
    for (const el of [
      createElement(Alert, { tone: 'error', title: 'Blocked' }, 'Fix sources'),
      createElement(EmptyState, { title: 'Nothing here' }, 'Add your first source.'),
    ]) {
      const r = await axeOn(el);
      expect(r.violations).toEqual([]);
    }
  });
});
