/**
 * ResearchWithME v3.4 Canonical Domain Contracts, Block Registry,
 * Deterministic MDX Serialization, and Research Integrity Publication Blockers.
 *
 * Grounded in ResearchWithME-master-refactor-development-plan-v3.4.md (§3, §9–11, §15–16, §26).
 */
import { z } from 'zod';

// ── 1. Contribution Taxonomy (§3.1–3.2) ────────────────────────────────────

export const CONTRIBUTION_TYPES = [
  'paper-review',
  'tool-review',
  'perspective',
  'research-note',
  'dataset-review',
  'replication-report',
  'research-question',
  'literature-summary',
  'method-review',
  'implementation-note',
] as const;

export type ContributionType = (typeof CONTRIBUTION_TYPES)[number];

export type ContributionTier = 'quick' | 'structured' | 'long-form';

export interface ContributionTypeMeta {
  type: ContributionType;
  label: string;
  tier: ContributionTier;
  shortDescription: string;
  requiresSource: boolean;
  estimatedMinutes: number;
  interviewPrompts: string[];
}

export const CONTRIBUTION_TYPE_CATALOG: Record<ContributionType, ContributionTypeMeta> = {
  perspective: {
    type: 'perspective',
    label: 'Perspective',
    tier: 'quick',
    shortDescription: 'Share a grounded observation, methodological critique, or field commentary.',
    requiresSource: false,
    estimatedMinutes: 5,
    interviewPrompts: [
      'What observation or question motivated this perspective?',
      'Which concrete paper, dataset, or experiment anchors your point?',
      'What limitations or counterarguments should readers keep in mind?',
    ],
  },
  'research-note': {
    type: 'research-note',
    label: 'Research note',
    tier: 'quick',
    shortDescription: 'Document an experimental finding, negative result, or lab takeaway.',
    requiresSource: false,
    estimatedMinutes: 8,
    interviewPrompts: [
      'What did you test or observe?',
      'What exact setup, benchmark, or artifact was involved?',
      'What remains uncertain or unverified?',
    ],
  },
  'research-question': {
    type: 'research-question',
    label: 'Research question',
    tier: 'quick',
    shortDescription: 'Pose an open, testable question with context and candidate references.',
    requiresSource: false,
    estimatedMinutes: 5,
    interviewPrompts: [
      'What specific question needs an evidence-backed answer?',
      'What existing work partially addresses or conflicts on it?',
      'What evidence would resolve the question?',
    ],
  },
  'implementation-note': {
    type: 'implementation-note',
    label: 'Implementation note',
    tier: 'quick',
    shortDescription: 'Record practical reproduction details, hyperparameter traps, or benchmark notes.',
    requiresSource: true,
    estimatedMinutes: 10,
    interviewPrompts: [
      'Which repository, commit, or release did you evaluate?',
      'What worked as documented and what failed or diverged?',
      'What environment details affect reproducibility?',
    ],
  },
  'paper-review': {
    type: 'paper-review',
    label: 'Paper review',
    tier: 'structured',
    shortDescription: 'Structured evaluation of a paper’s claims, methodology, evidence, and limits.',
    requiresSource: true,
    estimatedMinutes: 15,
    interviewPrompts: [
      'What is the paper’s central claim and what evidence supports it?',
      'Where are the methodological strengths and threats to validity?',
      'Are code, data, and experimental details reproducible?',
    ],
  },
  'tool-review': {
    type: 'tool-review',
    label: 'Tool review',
    tier: 'structured',
    shortDescription: 'Hands-on evaluation of an open-source research library, CLI, or workflow tool.',
    requiresSource: true,
    estimatedMinutes: 12,
    interviewPrompts: [
      'What research workflow does this tool solve?',
      'How did it perform on a concrete benchmark or real task?',
      'What failure modes, lock-in risks, or dependencies stand out?',
    ],
  },
  'dataset-review': {
    type: 'dataset-review',
    label: 'Dataset review',
    tier: 'structured',
    shortDescription: 'Inspect dataset provenance, licensing, sampling bias, and benchmark leakage.',
    requiresSource: true,
    estimatedMinutes: 15,
    interviewPrompts: [
      'How was this dataset collected, labeled, and licensed?',
      'What quality gaps, distribution skews, or contamination issues appear?',
      'For which tasks is this dataset appropriate or inappropriate?',
    ],
  },
  'method-review': {
    type: 'method-review',
    label: 'Method review',
    tier: 'structured',
    shortDescription: 'Compare an analytical or experimental method against standard baselines.',
    requiresSource: true,
    estimatedMinutes: 15,
    interviewPrompts: [
      'What assumptions does this method rely on?',
      'When does it outperform or underperform established baselines?',
      'What diagnostic checks should practitioners run?',
    ],
  },
  'replication-report': {
    type: 'replication-report',
    label: 'Replication report',
    tier: 'structured',
    shortDescription: 'Document an independent attempt to reproduce published results or code.',
    requiresSource: true,
    estimatedMinutes: 20,
    interviewPrompts: [
      'Which exact claim, table, or figure did you attempt to replicate?',
      'Did your outcome match, partially match, or fail to replicate?',
      'What compute, data, or code differences were required?',
    ],
  },
  'literature-summary': {
    type: 'literature-summary',
    label: 'Literature summary',
    tier: 'long-form',
    shortDescription: 'Synthesize multiple sources, competing claims, and consensus boundaries.',
    requiresSource: true,
    estimatedMinutes: 25,
    interviewPrompts: [
      'What scope and inclusion criteria define this synthesis?',
      'Where do primary sources converge and where do they contradict?',
      'What gaps remain open for future study?',
    ],
  },
};

// ── 2. Canonical Typed Scholarly Block Document (§10.1–10.6) ───────────────

export const BLOCK_TYPES = [
  'paragraph',
  'heading',
  'evidence',
  'claim',
  'citation',
  'limitation',
  'question',
  'code',
  'callout',
] as const;

export type ResearchBlockType = (typeof BLOCK_TYPES)[number];

export const ResearchBlockSchema = z.object({
  id: z.string().min(1).max(80),
  type: z.enum(BLOCK_TYPES),
  text: z.string().max(12_000),
  level: z.number().int().min(1).max(4).optional(),
  sourceId: z.string().max(120).optional(),
  sourceVersionId: z.string().max(120).optional(),
  locator: z.string().max(240).optional(),
  evidenceId: z.string().max(120).optional(),
  claimId: z.string().max(120).optional(),
  relation: z.enum(['SUPPORTS', 'CONTRADICTS', 'QUALIFIES']).optional(),
  language: z.string().max(40).optional(),
  limitation: z.string().max(2_000).optional(),
});

export type ResearchBlock = z.infer<typeof ResearchBlockSchema>;

export const ResearchDocumentSchema = z.object({
  schemaVersion: z.literal('1.0'),
  id: z.string().min(1).max(120),
  title: z.string().max(260),
  authorId: z.string().max(120),
  workspaceId: z.string().max(120).default('personal'),
  version: z.number().int().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  blocks: z.array(ResearchBlockSchema).max(200),
});

export type ResearchDocument = z.infer<typeof ResearchDocumentSchema>;

function sanitizeMdxAttr(value: string): string {
  return value.replace(/["<>`{}\r\n]/g, ' ').trim();
}

function escapeMdxText(value: string): string {
  return value.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Deterministic, safe MDX serialization (§10.6).
 * Never emits raw JSX event handlers, script tags, or unescaped attributes.
 */
export function serializeResearchDocumentToMdx(doc: ResearchDocument): string {
  const sections: string[] = [];
  if (doc.title.trim()) {
    sections.push(`# ${escapeMdxText(doc.title.trim())}`);
  }

  for (const block of doc.blocks) {
    const rawBody = block.text.trim();
    if (!rawBody) continue;
    const body = block.type === 'code' ? rawBody : escapeMdxText(rawBody);

    switch (block.type) {
      case 'heading': {
        const hashes = '#'.repeat(Math.min(4, Math.max(2, block.level ?? 2)));
        sections.push(`${hashes} ${body}`);
        break;
      }
      case 'paragraph': {
        sections.push(body);
        break;
      }
      case 'evidence': {
        const attrs = [
          block.sourceId ? `source="${sanitizeMdxAttr(block.sourceId)}"` : '',
          block.locator ? `locator="${sanitizeMdxAttr(block.locator)}"` : '',
        ]
          .filter(Boolean)
          .join(' ');
        const lim = block.limitation?.trim() ? `\n\n_Limitation:_ ${block.limitation.trim()}` : '';
        sections.push(`> **Evidence**${attrs ? ` (${attrs})` : ''}\n> ${body.replace(/\n/g, '\n> ')}${lim}`);
        break;
      }
      case 'claim': {
        const rel = block.relation ? ` [${block.relation}]` : '';
        sections.push(`> **Claim${rel}**\n> ${body.replace(/\n/g, '\n> ')}`);
        break;
      }
      case 'citation': {
        const loc = block.locator?.trim() ? ` — ${block.locator.trim()}` : '';
        sections.push(`- Citation: ${body}${loc}`);
        break;
      }
      case 'limitation': {
        sections.push(`> **Limitation**\n> ${body.replace(/\n/g, '\n> ')}`);
        break;
      }
      case 'question': {
        sections.push(`> **Open Research Question**\n> ${body.replace(/\n/g, '\n> ')}`);
        break;
      }
      case 'code': {
        const lang = (block.language ?? 'text').replace(/[^a-zA-Z0-9_-]/g, '');
        sections.push(`\`\`\`${lang}\n${body}\n\`\`\``);
        break;
      }
      case 'callout': {
        sections.push(`> **Note**\n> ${body.replace(/\n/g, '\n> ')}`);
        break;
      }
    }
  }

  return sections.join('\n\n').trim();
}

// ── 3. Multidimensional Trust & AI Provenance (§16) ────────────────────────

export const TrustDimensionsSchema = z.object({
  review: z.enum(['not-reviewed', 'editorially-reviewed', 'peer-reviewed']).default('not-reviewed'),
  replication: z
    .enum(['not-assessed', 'replicated', 'partially-replicated', 'failed-to-replicate'])
    .default('not-assessed'),
  certainty: z.enum(['very-low', 'low', 'moderate', 'high']).default('moderate'),
  consensus: z.enum(['unknown', 'emerging', 'mixed', 'broad', 'contested']).default('unknown'),
  sourceIntegrity: z
    .enum(['active', 'corrected', 'expression-of-concern', 'retracted', 'withdrawn'])
    .default('active'),
  method: z.string().min(1).max(300).default('Contributor structured checklist'),
  rationale: z.string().max(1_000).optional(),
});

export type TrustDimensions = z.infer<typeof TrustDimensionsSchema>;

export const AIProvenanceSchema = z.object({
  usedAi: z.boolean(),
  provider: z.string().max(80).optional(),
  model: z.string().max(120).optional(),
  operation: z.enum(['none', 'outline', 'draft-assist', 'summary', 'citation-check']).default('none'),
  promptVersion: z.string().max(60).optional(),
  humanReviewed: z.boolean(),
  humanReviewer: z.string().max(120).optional(),
  syntheticDisclosed: z.boolean().default(true),
  disclosureNote: z.string().max(600).optional(),
});

export type AIProvenance = z.infer<typeof AIProvenanceSchema>;

export interface PublicationBlocker {
  code:
    | 'UNRESOLVED_REQUIRED_SOURCE'
    | 'UNREVIEWED_RETRACTION_IMPACT'
    | 'INFERRED_EVIDENCE_MISSING_LIMITATION'
    | 'MISSING_HUMAN_REVIEW_FOR_AI'
    | 'SYNTHETIC_UNDISCLOSED'
    | 'EMPTY_CONTENT';
  message: string;
  field?: string;
}

export function evaluatePublicationBlockers(input: {
  contributionType: ContributionType;
  title: string;
  summary: string;
  blocks: ResearchBlock[];
  primarySourceId?: string | null;
  primarySourceIntegrity?: string | null;
  retractionAddressed?: boolean;
  aiProvenance?: AIProvenance | null;
}): PublicationBlocker[] {
  const blockers: PublicationBlocker[] = [];
  const meta = CONTRIBUTION_TYPE_CATALOG[input.contributionType];

  if (!input.title.trim() || !input.summary.trim() || input.blocks.every((b) => !b.text.trim())) {
    blockers.push({
      code: 'EMPTY_CONTENT',
      message: 'A contribution needs a title, concise summary, and at least one non-empty scholarly block.',
      field: 'document',
    });
  }

  if (meta.requiresSource && !input.primarySourceId?.trim()) {
    blockers.push({
      code: 'UNRESOLVED_REQUIRED_SOURCE',
      message: `${meta.label} contributions must resolve and attach a canonical primary source before publishing.`,
      field: 'primarySourceId',
    });
  }

  if (
    (input.primarySourceIntegrity === 'retracted' || input.primarySourceIntegrity === 'withdrawn') &&
    !input.retractionAddressed
  ) {
    blockers.push({
      code: 'UNREVIEWED_RETRACTION_IMPACT',
      message:
        'The primary source is marked retracted or withdrawn. Explicitly acknowledge and document the retraction impact before publishing.',
      field: 'retractionAddressed',
    });
  }

  for (const block of input.blocks) {
    if (block.type === 'evidence' && !block.locator?.trim()) {
      blockers.push({
        code: 'INFERRED_EVIDENCE_MISSING_LIMITATION',
        message: 'Every evidence block must include a concrete source locator (page, table, figure, section, or line range).',
        field: block.id,
      });
      break;
    }
  }

  if (input.aiProvenance?.usedAi) {
    if (!input.aiProvenance.humanReviewed) {
      blockers.push({
        code: 'MISSING_HUMAN_REVIEW_FOR_AI',
        message: 'AI-assisted contributions require explicit human verification before publishing.',
        field: 'aiProvenance.humanReviewed',
      });
    }
    if (!input.aiProvenance.syntheticDisclosed) {
      blockers.push({
        code: 'SYNTHETIC_UNDISCLOSED',
        message: 'AI assistance must be disclosed in the contribution provenance record.',
        field: 'aiProvenance.syntheticDisclosed',
      });
    }
  }

  return blockers;
}

// ── 4. API Request / Response Contracts (§15 & §27) ────────────────────────

export const ResolveSourceInputSchema = z.object({
  query: z.string().trim().min(3).max(500),
  title: z.string().trim().max(300).optional(),
  authors: z.array(z.string().trim().min(1).max(120)).max(25).optional(),
  venue: z.string().trim().max(160).optional(),
  publishedDate: z.string().trim().max(40).optional(),
  sourceType: z
    .enum(['paper', 'preprint', 'software', 'dataset', 'protocol', 'webpage', 'book', 'report'])
    .optional(),
});

export const CreateIntegrityEventInputSchema = z.object({
  status: z.enum(['active', 'corrected', 'expression-of-concern', 'retracted', 'withdrawn']),
  summary: z.string().trim().min(10).max(1_000),
  noticeUrl: z.string().url().optional(),
  disposition: z.enum(['open', 'acknowledged', 'publication-blocked', 'resolved']).default('open'),
});

export const CreateEvidenceInputSchema = z.object({
  sourceId: z.string().min(1).max(120),
  sourceVersionId: z.string().min(1).max(120),
  statement: z.string().trim().min(10).max(2_000),
  quote: z.string().trim().max(2_000).optional(),
  locator: z.object({
    kind: z.enum(['page', 'section', 'table', 'figure', 'line-range', 'timestamp', 'url-fragment']).default('section'),
    value: z.string().trim().min(1).max(200),
  }),
  extractionType: z.enum(['direct-quote', 'paraphrase', 'quantitative', 'table-figure', 'code-artifact', 'inferred']),
  limitation: z.string().trim().max(1_000).optional(),
  assessment: TrustDimensionsSchema.optional(),
}).refine(
  (data) => data.extractionType !== 'inferred' || Boolean(data.limitation && data.limitation.trim().length > 0),
  { message: 'Inferred evidence must include a stated limitation.', path: ['limitation'] },
);

export const UpdateEvidenceInputSchema = z.object({
  statement: z.string().trim().min(10).max(2_000).optional(),
  quote: z.string().trim().max(2_000).optional(),
  limitation: z.string().trim().max(1_000).optional(),
  assessment: TrustDimensionsSchema.optional(),
});

export const CreateClaimInputSchema = z.object({
  claimType: z.enum(['empirical', 'methodological', 'causal', 'comparative', 'normative', 'replication']),
  statement: z.string().trim().min(10).max(1_500),
  assessment: TrustDimensionsSchema.optional(),
});

export const CreateRelationshipInputSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('claim-evidence'),
    claimId: z.string().min(1).max(120),
    evidenceId: z.string().min(1).max(120),
    relationship: z.enum(['SUPPORTS', 'CONTRADICTS', 'QUALIFIES']),
    assertionMethod: z.enum(['MANUAL', 'AI_SUGGESTED', 'IMPORTED']).default('MANUAL'),
    confidence: z.number().min(0).max(1).optional(),
    rationale: z.string().trim().max(1_000).optional(),
  }),
  z.object({
    kind: z.literal('contribution-evidence'),
    contributionId: z.string().min(1).max(120),
    evidenceId: z.string().min(1).max(120),
  }),
  z.object({
    kind: z.literal('contribution-claim'),
    contributionId: z.string().min(1).max(120),
    claimId: z.string().min(1).max(120),
  }),
]);

export const CreateContributionInputSchema = z.object({
  contributionType: z.enum(CONTRIBUTION_TYPES),
  title: z.string().trim().min(5).max(240),
  subtitle: z.string().trim().max(260).optional(),
  summary: z.string().trim().min(15).max(1_200),
  document: ResearchDocumentSchema,
  primarySourceId: z.string().max(120).optional().nullable(),
  primarySourceVersionId: z.string().max(120).optional().nullable(),
  topics: z.array(z.string().trim().min(1).max(60)).max(8).default([]),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  limitations: z.array(z.string().trim().min(1).max(400)).max(10).default([]),
  trustAssessment: TrustDimensionsSchema.optional(),
  aiProvenance: AIProvenanceSchema.optional().nullable(),
  evidenceIds: z.array(z.string().min(1).max(120)).max(30).default([]),
  claimIds: z.array(z.string().min(1).max(120)).max(20).default([]),
});

export const UpdateContributionInputSchema = CreateContributionInputSchema.partial().extend({
  baseVersion: z.number().int().min(1).optional(),
});

export const PublishContributionInputSchema = z.object({
  retractionAddressed: z.boolean().default(false),
  aiProvenance: AIProvenanceSchema.optional().nullable(),
});

export const AutosaveDraftInputSchema = z.object({
  mutationId: z.string().trim().min(6).max(120),
  baseVersion: z.number().int().min(0),
  contributionType: z.enum(CONTRIBUTION_TYPES).default('perspective'),
  title: z.string().max(240),
  document: ResearchDocumentSchema,
  reason: z.enum(['interval', 'manual', 'pre-publish', 'conflict']).default('interval'),
});

export const ResolveConflictInputSchema = z.object({
  strategy: z.enum(['keep-client', 'keep-server', 'merge']),
  mergedDocument: ResearchDocumentSchema.optional(),
  expectedServerVersion: z.number().int().min(1),
});

export const LibraryItemInputSchema = z.object({
  itemType: z.enum(['contribution', 'article', 'source', 'evidence', 'claim', 'tool']),
  itemId: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(260),
  url: z.string().trim().min(1).max(500),
  collection: z.string().trim().min(1).max(80).default('Saved'),
  note: z.string().trim().max(600).optional(),
});

export const ResearchGoalInputSchema = z.object({
  title: z.string().trim().min(3).max(180),
  metric: z.enum([
    'SOURCES_REVIEWED',
    'CONTRIBUTIONS_PUBLISHED',
    'REVIEWS_COMPLETED',
    'EVIDENCE_ATTACHED',
    'CITATIONS_RESOLVED',
    'MILESTONES_COMPLETED',
    'REPLICATIONS_DOCUMENTED',
    'CUSTOM',
  ]),
  targetValue: z.number().int().min(1).max(10_000),
  currentValue: z.number().int().min(0).max(10_000).default(0),
  period: z.enum(['ONE_TIME', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'CUSTOM']).default('WEEKLY'),
  dueAt: z.string().optional(),
});

export const UpdateResearchGoalInputSchema = z.object({
  id: z.string().min(1).max(120),
  currentValue: z.number().int().min(0).max(10_000).optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'EXPIRED', 'ARCHIVED']).optional(),
});

import {
  normalizeScholarlyIdentifier,
  type NormalizedIdentifier,
} from './identifiers';

export {
  normalizeScholarlyIdentifier,
  verifyIsbnChecksum,
  verifyIssnChecksum,
  verifyOrcidChecksum,
  type CanonicalIdentifierScheme,
  type InferredSourceKind,
  type NormalizedIdentifier,
} from './identifiers';

// ── 5. Source Identifier Parser (DOI, ORCID, PMID, PMCID, ISBN, issn, arXiv, ROR, RRID, Accession, SWHID, GitHub, GitLab, URL) ──

export type ParsedSourceIdentifier = NormalizedIdentifier;

export function parseSourceIdentifier(rawInput: string): ParsedSourceIdentifier | null {
  return normalizeScholarlyIdentifier(rawInput);
}

export const CONTRIBUTION_CATALOG = CONTRIBUTION_TYPE_CATALOG;
export const SaveLibraryItemInputSchema = LibraryItemInputSchema;
export const CreateResearchGoalInputSchema = ResearchGoalInputSchema;

