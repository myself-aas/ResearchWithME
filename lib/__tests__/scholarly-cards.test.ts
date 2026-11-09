import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { trustDimensions, compactTrustLine } from '@/lib/scholarly/trust';
import { resolveSourceState, primaryIdentifier } from '@/lib/scholarly/source-card';
import { can, evidenceCounts, claimCardLabel } from '@/lib/scholarly/claim-card';
import TrustAssessmentSummary from '@/components/scholarly/TrustAssessmentSummary';
import SourceCard from '@/components/scholarly/SourceCard';
import ClaimCard from '@/components/scholarly/ClaimCard';
import { validateEvidenceAssessment, isNegativeAssessment, type EvidenceAssessment, type Source, type SourceVersion, type Claim } from '@/lib/schemas/scholarly';

const UUID = '018f2a6e-7c1d-7f3a-9b2c-4d5e6f708192';
const UUID2 = '018f2a6e-7c1d-7f3a-9b2c-4d5e6f708193';
const TS = '2026-11-09T12:00:00Z';

const base = {
  id: UUID,
  schemaVersion: '3.1' as const,
  objectVersion: 1,
  workspaceId: UUID2,
  lifecycle: 'active' as const,
  classification: 'public' as const,
  createdAt: TS,
  createdBy: UUID2,
  updatedAt: TS,
  updatedBy: UUID2,
};

const assessment: EvidenceAssessment = {
  review: 'peer-reviewed',
  replication: 'not-assessed',
  certainty: 'moderate',
  consensus: 'mixed',
  sourceIntegrity: 'active',
  assessedBy: UUID2,
  assessedAt: TS,
  method: 'structured checklist v2',
};

const source: Source = {
  ...base,
  type: 'source',
  title: 'A Study of X',
  translatedTitle: 'X discsolto',
  language: 'en',
  sourceType: 'article',
  identifiers: [
    { scheme: 'url', value: 'https://example.com/x', normalizedValue: 'https://example.com/x', resolutionStatus: 'resolved' },
    { scheme: 'doi', value: '10.1000/xyz123', normalizedValue: '10.1000/xyz123', canonicalUrl: 'https://doi.org/10.1000/xyz123', resolutionStatus: 'resolved', resolvedAt: TS },
  ],
  contributors: [{ name: 'A. Researcher', orcid: '0000-0002-1825-0097' }],
  currentVersionId: UUID2,
  access: 'open',
};

const sourceVersion: SourceVersion = { ...base, type: 'source-version', sourceId: UUID, versionLabel: '2', integrity: { retractionStatus: 'none' }, publishedAt: TS, checksum: 'sha256:abcdef' };

const claim: Claim = {
  ...base,
  type: 'claim',
  text: 'X reduces Y by 31%.',
  claimType: 'causal',
  supportingEvidenceIds: [UUID2],
  contradictingEvidenceIds: [],
};

describe('trust model (§23) — dimensions stay independent', () => {
  it('renders five independent dimensions, never one score', () => {
    const dims = trustDimensions(assessment);
    expect(dims.map((d) => d.dimension)).toEqual(['review', 'replication', 'certainty', 'consensus', 'sourceIntegrity']);
  });

  it('"not assessed" is not a negative result', () => {
    expect(isNegativeAssessment('not-assessed')).toBe(false);
    expect(isNegativeAssessment('failed-to-replicate')).toBe(true);
    const dims = trustDimensions(assessment);
    const rep = dims.find((d) => d.dimension === 'replication')!;
    expect(rep.polarity).toBe('not-assessed');
    expect(rep.toneClass).toContain('text-text-tertiary');
  });

  it('compact line matches the §23 format', () => {
    expect(compactTrustLine(assessment)).toBe('Peer reviewed · Replication not assessed · Moderate certainty · Mixed consensus · Source active');
  });

  it('assessment validator requires a documented method', () => {
    expect(validateEvidenceAssessment({ ...assessment, method: '' }).ok).toBe(false);
    expect(validateEvidenceAssessment(assessment).ok).toBe(true);
    expect(validateEvidenceAssessment({ ...assessment, review: 'super-reviewed' }).ok).toBe(false);
  });

  it('TrustAssessmentSummary renders a list with sr-only polarity notes', () => {
    const html = renderToStaticMarkup(createElement(TrustAssessmentSummary, { assessment }));
    expect(html).toContain('aria-label="Trust assessment"');
    expect(html).toContain('Replication: Not assessed');
    expect(html).toContain('not assessed — no negative finding');
    expect(html).not.toContain('score');
  });
});

describe('SourceCard (§27.3)', () => {
  it('state precedence: retraction beats restriction', () => {
    const r = resolveSourceState({ classification: 'restricted' }, { integrity: { retractionStatus: 'retracted' } }, []);
    expect(r.state).toBe('retracted');
  });

  it('prefers DOI as primary identifier', () => {
    expect(primaryIdentifier(source)?.scheme).toBe('doi');
  });

  it('renders type, title, translated title label, contributors, identifier, access, integrity, version', () => {
    const html = renderToStaticMarkup(createElement(SourceCard, { source, sourceVersion, permissions: [{ capability: 'read:source', granted: true }] }));
    expect(html).toContain('aria-label="Source:');
    expect(html).toContain('article · en · v2');
    expect(html).toContain('A Study of X');
    expect(html).toContain('Translated title: X discsolto');
    expect(html).toContain('A. Researcher (0000-0002-1825-0097)');
    expect(html).toContain('doi: 10.1000/xyz123');
    expect(html).toContain('Open access');
    expect(html).toContain('Active');
  });

  it('restricted source without read permission hides metadata', () => {
    const html = renderToStaticMarkup(
      createElement(SourceCard, { source: { ...source, classification: 'restricted' }, sourceVersion, permissions: [] }),
    );
    expect(html).toContain('Metadata hidden');
    expect(html).not.toContain('font-serif text-[1.5rem]'); // title body not rendered (aria-label still names the source)
  });
});

describe('ClaimCard (§27.4)', () => {
  it('capability check gates actions', () => {
    expect(can([{ capability: 'support:claim', granted: true }], 'support:claim')).toBe(true);
    expect(can([{ capability: 'support:claim', granted: false }], 'support:claim')).toBe(false);
    expect(can([], 'inspect:claim')).toBe(false);
  });

  it('counts line is counts only, never a score', () => {
    expect(evidenceCounts(4, 2)).toBe('4 supporting · 2 contradicting');
    expect(claimCardLabel(claim)).toContain('causal');
  });

  it('renders counts, mixed marker, compact trust line, and only permitted actions', () => {
    const html = renderToStaticMarkup(
      createElement(ClaimCard, {
        claim,
        assessment: { ...assessment, evidenceCount: 4, contradictionCount: 2, lastRecomputedAt: TS },
        responsibleReviewer: 'Dr. R.',
        permissions: [{ capability: 'inspect:claim', granted: true }, { capability: 'support:claim', granted: false }],
        onInspect: () => {},
        onSupport: () => {},
      }),
    );
    expect(html).toContain('Claim · causal · active · v1');
    expect(html).toContain('4 supporting · 2 contradicting');
    expect(html).toContain('evidence is mixed');
    expect(html).toContain('Peer reviewed · Replication not assessed');
    expect(html).toContain('Responsible reviewer: Dr. R.');
    expect(html).toContain('Inspect');
    expect(html).not.toContain('>Support<'); // capability denied
  });

  it('unresolved integrity impact blocks publication wording', () => {
    const html = renderToStaticMarkup(
      createElement(ClaimCard, {
        claim,
        permissions: [],
        unresolvedIntegrity: [{ id: UUID, at: TS, eventType: 'retraction', sourceId: UUID, sourceVersionId: UUID2, affectedObjectIds: [UUID], recordedBy: UUID2 }],
      }),
    );
    expect(html).toContain('publication is blocked');
  });
});
