import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  resolveEvidenceState,
  assessmentText,
  evidenceCardLabel,
  evidenceCardComponentTokens,
} from '@/lib/scholarly/evidence-card';
import EvidenceCard from '@/components/scholarly/EvidenceCard';
import type { Evidence, Source, SourceVersion } from '@/lib/schemas/scholarly';

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

const evidence: Evidence = {
  ...base,
  type: 'evidence',
  sourceVersionId: UUID2,
  locator: { kind: 'page', value: 'p. 42' },
  statement: 'The reported effect size is 0.31 (95% CI 0.12–0.50).',
  extractionType: 'extracted',
  assessment: 'supports',
};

const source: Source = {
  ...base,
  type: 'source',
  title: 'A Study of X',
  language: 'en',
  sourceType: 'article',
  identifiers: [{ scheme: 'doi', value: '10.1000/xyz123', normalizedValue: '10.1000/xyz123', canonicalUrl: 'https://doi.org/10.1000/xyz123', resolutionStatus: 'resolved', resolvedAt: TS }],
  contributors: [{ name: 'A. Researcher' }],
  currentVersionId: UUID2,
  access: 'open',
};

const sourceVersion: SourceVersion = {
  ...base,
  type: 'source-version',
  sourceId: UUID,
  versionLabel: '1',
  integrity: { retractionStatus: 'none' },
};

const readGranted = [{ capability: 'read:evidence', granted: true }];

describe('resolveEvidenceState precedence (§27.1)', () => {
  it('retraction beats everything', () => {
    const r = resolveEvidenceState(
      { classification: 'embargoed' },
      source,
      { integrity: { retractionStatus: 'retracted' } },
      readGranted,
    );
    expect(r.state).toBe('retracted');
    expect(r.notice?.tone).toBe('error');
    expect(r.notice?.text).toContain('retracted');
  });

  it('correction beats embargo and restriction', () => {
    const r = resolveEvidenceState({ classification: 'restricted' }, source, { integrity: { retractionStatus: 'corrected' } }, []);
    expect(r.state).toBe('corrected');
  });

  it('embargo beats unresolved identifiers', () => {
    const unresolvedSource = { identifiers: [{ ...source.identifiers[0], resolutionStatus: 'unresolved' as const }] };
    const r = resolveEvidenceState({ classification: 'embargoed' }, unresolvedSource, sourceVersion, readGranted);
    expect(r.state).toBe('embargoed');
  });

  it('restricted classification hides body when read is denied, shows when granted', () => {
    const denied = resolveEvidenceState({ classification: 'restricted' }, source, sourceVersion, []);
    expect(denied.state).toBe('restricted');
    const granted = resolveEvidenceState({ classification: 'restricted' }, source, sourceVersion, readGranted);
    expect(granted.state).toBe('ready');
  });

  it('unresolved identifier → unresolved state; resolved → ready', () => {
    const unresolvedSource = { identifiers: [{ ...source.identifiers[0], resolutionStatus: 'unresolved' as const }] };
    expect(resolveEvidenceState({ classification: 'public' }, unresolvedSource, sourceVersion, readGranted).state).toBe('unresolved');
    expect(resolveEvidenceState({ classification: 'public' }, source, sourceVersion, readGranted).state).toBe('ready');
  });
});

describe('calibrated copy (§8)', () => {
  it('never uses "trusted"/"verified"/"proven" without a method', () => {
    expect(assessmentText('supports', 4, 0)).toBe('Supported by 4 sources');
    expect(assessmentText('supports', 4, 2)).toContain('evidence is mixed');
    expect(assessmentText('unassessed', 0, 0)).toBe('Not assessed');
    for (const t of [assessmentText('supports', 1, 0), assessmentText('contradicts', 0, 1)]) {
      expect(t).not.toMatch(/trusted|verified|proven|high quality/i);
    }
  });
});

describe('EvidenceCard rendering (§27.2)', () => {
  it('labels the article from evidence + source, not status alone', () => {
    expect(evidenceCardLabel(evidence, source)).toContain('A Study of X');
    expect(evidenceCardLabel(evidence, source)).toContain('page p. 42');
  });

  it('ready state renders statement, locator, assessment, and actions', () => {
    const html = renderToStaticMarkup(
      createElement(EvidenceCard, {
        evidence, source, sourceVersion, permissions: readGranted, supportingCount: 4,
        onInspect: () => {}, onAddSupport: () => {}, onRequestReview: () => {},
      }),
    );
    expect(html).toContain('<article');
    expect(html).toContain('aria-label="Evidence:');
    expect(html).toContain('effect size is 0.31');
    expect(html).toContain('page p. 42');
    expect(html).toContain('Supported by 4 sources');
    expect(html).toContain('Inspect');
    expect(html).toContain('Request review');
  });

  it('retracted state puts the notice before ordinary metadata and blocks publication wording', () => {
    const retracted = { ...sourceVersion, integrity: { retractionStatus: 'retracted' as const } };
    const html = renderToStaticMarkup(
      createElement(EvidenceCard, { evidence, source, sourceVersion: retracted, permissions: readGranted }),
    );
    expect(html.indexOf('Retraction notice')).toBeLessThan(html.indexOf('text-[1.125rem]')); // notice precedes the statement body
    expect(html).toContain('MUST NOT support publication');
  });

  it('restricted without read permission hides the statement', () => {
    const html = renderToStaticMarkup(
      createElement(EvidenceCard, { evidence: { ...evidence, classification: 'restricted' }, source, sourceVersion, permissions: [] }),
    );
    expect(html).toContain('Content hidden');
    expect(html).not.toContain('text-[1.125rem]'); // statement body is not rendered
  });

  it('loading renders an aria-labelled skeleton; error renders role="alert"', () => {
    const loading = renderToStaticMarkup(createElement(EvidenceCard, { evidence, source, sourceVersion, permissions: readGranted, loading: true }));
    expect(loading).toContain('aria-label="Loading evidence"');
    expect(loading).toContain('aria-hidden="true"');
    const err = renderToStaticMarkup(createElement(EvidenceCard, { evidence, source, sourceVersion, permissions: readGranted, error: 'boom' }));
    expect(err).toContain('role="alert"');
  });

  it('AI-assisted evidence is labeled with provider, model, and approval state (§26)', () => {
    const aiEvidence: Evidence = {
      ...evidence,
      aiProvenance: {
        provider: 'Gemini', model: 'gemini-3.8-flash', operation: 'summarize', sourceSet: [UUID2],
        generatedAt: TS, transformationType: 'extracted', citationValidation: 'passed',
        humanApproval: { reviewerId: UUID2, approvedAt: TS },
      },
    };
    const html = renderToStaticMarkup(createElement(EvidenceCard, { evidence: aiEvidence, source, sourceVersion, permissions: readGranted }));
    expect(html).toContain('AI-assisted');
    expect(html).toContain('human-approved');
  });

  it('component token aliases resolve to semantic values', () => {
    expect(evidenceCardComponentTokens.accent).toBe('#059669'); // knowledge.evidence
    expect(evidenceCardComponentTokens.background).toBe('#F3F1EC'); // surface
  });
});
