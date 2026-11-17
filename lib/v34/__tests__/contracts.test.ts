import { describe, expect, it } from 'vitest';
import {
  CONTRIBUTION_CATALOG,
  CONTRIBUTION_TYPES,
  evaluatePublicationBlockers,
  parseSourceIdentifier,
  serializeResearchDocumentToMdx,
  type ResearchDocument,
} from '@/lib/v34/contracts';

describe('v3.4 scholarly contracts', () => {
  it('defines all 10 canonical contribution types with metadata', () => {
    expect(CONTRIBUTION_TYPES).toHaveLength(10);
    for (const type of CONTRIBUTION_TYPES) {
      expect(CONTRIBUTION_CATALOG[type].label.length).toBeGreaterThan(2);
      expect(CONTRIBUTION_CATALOG[type].shortDescription.length).toBeGreaterThan(10);
    }
  });

  it('deterministically compiles structured blocks to safe MDX without raw HTML tags', () => {
    const doc: ResearchDocument = {
      schemaVersion: '1.0',
      id: 'doc-1',
      title: 'Test Study',
      authorId: 'u-1',
      workspaceId: 'w-1',
      version: 1,
      createdAt: '2026-11-16T00:00:00.000Z',
      updatedAt: '2026-11-16T00:00:00.000Z',
      blocks: [
        { id: 'b1', type: 'heading', level: 2, text: 'Key Findings' },
        { id: 'b2', type: 'paragraph', text: 'Safe text <script>alert(1)</script> end.' },
        {
          id: 'b3',
          type: 'evidence',
          text: 'Pass@1 increased to 71.0%.',
          locator: 'Table 1',
          limitation: 'Math domain only',
        },
        { id: 'b4', type: 'limitation', text: 'Compute constrained.' },
      ],
    };

    const mdx = serializeResearchDocumentToMdx(doc);
    expect(mdx).toContain('## Key Findings');
    expect(mdx).not.toContain('<script>');
    expect(mdx).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(mdx).toContain('locator="Table 1"');
    expect(mdx).toContain('Pass@1 increased to 71.0%.');
    expect(mdx).toContain('**Limitation**');
    expect(mdx).toContain('Compute constrained.');
    // Deterministic check: identical input -> byte-identical output
    expect(serializeResearchDocumentToMdx(doc)).toBe(mdx);
  });

  it('enforces §16 publication blockers for retractions, unreviewed AI, and missing locators', () => {
    const blockers = evaluatePublicationBlockers({
      contributionType: 'paper-review',
      title: 'Review of Retracted Claim',
      summary: 'A thorough examination of a study whose primary source has been retracted.',
      blocks: [{ id: 'b1', type: 'evidence', text: 'Measurement without locator' }],
      primarySourceId: 'src-1',
      primarySourceIntegrity: 'retracted',
      retractionAddressed: false,
      aiProvenance: {
        usedAi: true,
        provider: 'Google',
        model: 'gemini-2.5-flash',
        operation: 'draft-assist',
        humanReviewed: false,
        syntheticDisclosed: true,
      },
    });

    const codes = blockers.map((b) => b.code);
    expect(codes).toContain('INFERRED_EVIDENCE_MISSING_LIMITATION');
    expect(codes).toContain('UNREVIEWED_RETRACTION_IMPACT');
    expect(codes).toContain('MISSING_HUMAN_REVIEW_FOR_AI');
  });

  it('passes §16 publication checks once integrity requirements are satisfied', () => {
    const blockers = evaluatePublicationBlockers({
      contributionType: 'paper-review',
      title: 'Verified Review of Reasoning Model',
      summary: 'Comprehensive verification of benchmark claims with explicit section locators.',
      blocks: [
        { id: 'b1', type: 'paragraph', text: 'Methodical verification of primary findings.' },
        { id: 'b2', type: 'evidence', text: 'Verified table result.', locator: 'Table 2' },
      ],
      primarySourceId: 'src-1',
      primarySourceIntegrity: 'active',
      aiProvenance: {
        usedAi: false,
        operation: 'none',
        humanReviewed: true,
        syntheticDisclosed: true,
      },
    });
    expect(blockers).toEqual([]);
  });

  it('parses DOI, arXiv, GitHub, and URL source identifiers cleanly', () => {
    expect(parseSourceIdentifier('https://doi.org/10.1038/s41586-024-00001-1')).toMatchObject({
      scheme: 'doi',
      value: '10.1038/s41586-024-00001-1',
      inferredType: 'paper',
    });
    expect(parseSourceIdentifier('arXiv:2501.12948')).toMatchObject({
      scheme: 'arxiv',
      value: '2501.12948',
      inferredType: 'preprint',
    });
    expect(parseSourceIdentifier('https://github.com/vllm-project/vllm')).toMatchObject({
      scheme: 'github',
      value: 'vllm-project/vllm',
      inferredType: 'software',
    });
    expect(parseSourceIdentifier('https://example.org/protocol')).toMatchObject({
      scheme: 'url',
      inferredType: 'webpage',
    });
  });
});
