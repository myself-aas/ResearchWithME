import { describe, expect, it } from 'vitest';
import {
  normalizeDoi,
  normalizeOrcid,
  normalizeIsbn,
  normalizeIssn,
  normalizeArxiv,
  normalizeRor,
  normalizeUrl,
} from '@/lib/schemas/identifiers';
import {
  validateEvidence,
  validateClaim,
  validateKnowledgeRelationship,
  validateExternalIdentifier,
  validateAuditEvent,
} from '@/lib/schemas/scholarly';

const UUID = '018f2a6e-7c1d-7f3a-9b2c-4d5e6f708192';
const UUID2 = '018f2a6e-7c1d-7f3a-9b2c-4d5e6f708193';
const TS = '2026-11-09T12:00:00Z';

// narrow a Result for assertions
function unwrap<T>(r: { ok: boolean; value?: T }): T {
  if (!r.ok) throw new Error('expected ok result');
  return r.value as T;
}

const base = {
  id: UUID,
  schemaVersion: '3.1',
  objectVersion: 1,
  workspaceId: UUID2,
  lifecycle: 'active',
  classification: 'public',
  createdAt: TS,
  createdBy: UUID2,
  updatedAt: TS,
  updatedBy: UUID2,
};

describe('identifier normalization (§22.2)', () => {
  it('normalizes DOIs to lowercase without the doi.org prefix', () => {
    expect(unwrap(normalizeDoi('https://doi.org/10.1000/XYZ123'))).toBe('10.1000/xyz123');
    expect(unwrap(normalizeDoi('10.1000/XYZ123'))).toBe('10.1000/xyz123');
    expect(normalizeDoi('not-a-doi').ok).toBe(false);
  });

  it('validates ORCID check digits and keeps hyphenation', () => {
    expect(unwrap(normalizeOrcid('0000-0002-1825-0097'))).toBe('0000-0002-1825-0097'); // classic example
    expect(normalizeOrcid('0000-0002-1825-0098').ok).toBe(false);
  });

  it('checksum-validates ISBN-13', () => {
    expect(unwrap(normalizeIsbn('978-0-13-468599-1'))).toBe('9780134685991');
    expect(normalizeIsbn('9780134685992').ok).toBe(false);
  });

  it('validates ISSN check digit', () => {
    expect(normalizeIssn('0317-8471').ok).toBe(true);
    expect(normalizeIssn('0317-8472').ok).toBe(false);
  });

  it('normalizes arXiv and ROR', () => {
    expect(unwrap(normalizeArxiv('arXiv:2401.12345v2'))).toBe('2401.12345v2');
    expect(unwrap(normalizeRor('https://ror.org/02jx3x895'))).toBe('https://ror.org/02jx3x895');
  });

  it('canonicalizes URLs without dropping version query params', () => {
    const r = normalizeUrl('HTTPS://Example.COM/paper?version=2#page=3');
    expect(r.ok).toBe(true);
    expect(unwrap(r)).toContain('version=2');
  });

  it('validateExternalIdentifier attaches canonical URL and status', () => {
    const r = validateExternalIdentifier({ scheme: 'doi', value: '10.1000/xyz123', resolutionStatus: 'resolved', resolvedAt: TS });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.normalizedValue).toBe('10.1000/xyz123');
      expect(r.value.canonicalUrl).toBe('https://doi.org/10.1000/xyz123'.toLowerCase());
      expect(r.value.resolutionStatus).toBe('resolved');
    }
  });
});

describe('evidence validation (§22.4)', () => {
  const evidence = {
    ...base,
    type: 'evidence',
    sourceVersionId: UUID2,
    locator: { kind: 'page', value: 'p. 42' },
    statement: 'The reported effect size is 0.31.',
    extractionType: 'extracted',
    assessment: 'supports',
  };

  it('accepts well-formed evidence', () => {
    expect(validateEvidence(evidence).ok).toBe(true);
  });

  it('requires an exact source location', () => {
    const r = validateEvidence({ ...evidence, locator: { kind: 'page', value: '' } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors?.locator).toBeTruthy();
  });

  it('requires a limitation for inferred evidence', () => {
    const r = validateEvidence({ ...evidence, extractionType: 'inferred' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors?.limitation).toContain('inferred');
  });

  it('rejects non-UTC timestamps and negative versions', () => {
    expect(validateEvidence({ ...evidence, createdAt: '2026-11-09 12:00:00' }).ok).toBe(false);
    expect(validateEvidence({ ...evidence, objectVersion: -1 }).ok).toBe(false);
  });
});

describe('claim validation — no associative → causal promotion', () => {
  const claim = {
    ...base,
    type: 'claim',
    text: 'X causes Y.',
    claimType: 'causal',
    supportingEvidenceIds: [UUID2],
    contradictingEvidenceIds: [],
  };

  it('rejects a causal claim supported only by inferred (associative) evidence', () => {
    const r = validateClaim(claim, [{ extractionType: 'inferred' }]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors?.claimType).toContain('causal');
  });

  it('accepts a causal claim with quoted/extracted support', () => {
    expect(validateClaim(claim, [{ extractionType: 'quoted' }]).ok).toBe(true);
  });
});

describe('relationship and audit validation', () => {
  it('requires a labeled edge; inferred edges need an explanation', () => {
    const rel = { ...base, type: 'relationship', label: 'supports', fromId: UUID, toId: UUID2, inferred: true };
    const r = validateKnowledgeRelationship(rel);
    expect(r.ok).toBe(false); // missing explanation for inferred edge
    expect(validateKnowledgeRelationship({ ...rel, explanation: 'derived from shared method' }).ok).toBe(true);
    expect(validateKnowledgeRelationship({ ...rel, label: 'unlabeled' }).ok).toBe(false);
  });

  it('validates audit events', () => {
    const ev = { id: UUID, at: TS, actorId: UUID2, action: 'publish', objectId: UUID, objectType: 'publication', workspaceId: UUID2 };
    expect(validateAuditEvent(ev).ok).toBe(true);
    expect(validateAuditEvent({ ...ev, at: 'yesterday' }).ok).toBe(false);
  });
});
