/**
 * ResearchWithME v3.4 Wave 6 Zod Contracts (`lib/v34/wave6-contracts.ts`).
 *
 * Covers:
 *  - Multi-entity search expansion (Part V §6.10, §10)
 *  - AI citation validation, quotation verification & provenance review (Part I §16, Part V §6.11, Part VIII §E)
 *  - Contribution submit-review & draft snapshot restore (Part V §6.8)
 *  - Legacy bookmark -> Library migration (Part V §6.4)
 *  - Checksummed scholarly exports (Part V §6.13)
 *  - Workspace invitations (Part V §6.2)
 */
import { z } from 'zod';

export const SEARCH_ENTITY_TYPES = [
  'source',
  'contribution',
  'tool',
  'project',
  'claim',
  'topic',
] as const;
export type SearchEntityType = (typeof SEARCH_ENTITY_TYPES)[number];

export const DATA_CLASSIFICATIONS = [
  'PUBLIC',
  'WORKSPACE',
  'RESTRICTED',
  'CONFIDENTIAL',
] as const;
export type DataClassification = (typeof DATA_CLASSIFICATIONS)[number];

export const EXPORT_FORMATS = [
  'bibtex',
  'csl-json',
  'markdown-provenance',
  'json-ld',
] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

// Search expansion (Part V §6.10 & §10.2)
export const SearchExpandInputSchema = z.object({
  query: z.string().trim().min(2).max(300),
  excludeTerms: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
});

// AI Citation Validation & Quotation Verification (Part V §6.11 & Part VIII §E)
export const ValidateCitationsInputSchema = z.object({
  targetType: z.enum(['contribution', 'draft', 'claim', 'citation-check']).default('contribution'),
  targetId: z.string().trim().min(1).max(120),
  sourceIds: z.array(z.string().trim().min(1).max(120)).max(50).default([]),
  evidenceIds: z.array(z.string().trim().min(1).max(120)).max(50).default([]),
  claimIds: z.array(z.string().trim().min(1).max(120)).max(50).default([]),
  provider: z.string().trim().min(1).max(80).default('researchwithme-deterministic-verifier'),
  model: z.string().trim().min(1).max(80).default('citation-integrity-v3.4'),
  classification: z.enum(DATA_CLASSIFICATIONS).default('PUBLIC'),
});

export const CheckQuotationInputSchema = z.object({
  targetId: z.string().trim().min(1).max(120),
  sourceId: z.string().trim().min(1).max(120),
  quotedText: z.string().trim().min(3).max(2_000),
  sourceExcerpt: z.string().trim().min(3).max(8_000),
  locatorLabel: z.string().trim().max(120).optional(),
  provider: z.string().trim().min(1).max(80).default('researchwithme-deterministic-verifier'),
  model: z.string().trim().min(1).max(80).default('quotation-matcher-v3.4'),
  classification: z.enum(DATA_CLASSIFICATIONS).default('PUBLIC'),
});

export const ReviewAiProvenanceInputSchema = z.object({
  id: z.string().trim().min(1).max(120),
  decision: z.enum(['APPROVED', 'REJECTED']),
  reviewNotes: z.string().trim().max(600).default(''),
});

// Contribution submit-review & Draft restore (Part V §6.8)
export const SubmitContributionReviewInputSchema = z.object({
  mode: z.enum(['SIGNED', 'ANONYMOUS']).default('ANONYMOUS'),
  note: z.string().trim().max(600).default(''),
});

export const RestoreDraftInputSchema = z.object({
  snapshotId: z.string().trim().min(1).max(120),
  expectedServerVersion: z.number().int().min(1).optional(),
});

// Legacy bookmarks -> Library migration (Part V §6.4)
export const MigrateBookmarksInputSchema = z.object({
  bookmarks: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(120),
        title: z.string().trim().min(1).max(240),
        url: z.string().trim().min(1).max(500),
        itemType: z.enum(['contribution', 'source', 'article', 'paper', 'tool']).default('article'),
        collection: z.string().trim().min(1).max(80).default('Imported Bookmarks'),
        note: z.string().trim().max(400).optional(),
      }),
    )
    .min(1)
    .max(200),
});

// Scholarly Export (Part V §6.13)
export const CreateExportInputSchema = z.object({
  targetType: z.enum(['contribution', 'source', 'citation-collection']),
  targetId: z.string().trim().min(1).max(120),
  format: z.enum(EXPORT_FORMATS).default('bibtex'),
});

// Workspace Invitations (Part V §6.2)
export const CreateWorkspaceInvitationInputSchema = z.object({
  email: z.string().trim().email().max(180),
  role: z.enum(['ADMIN', 'MEMBER', 'REVIEWER', 'VIEWER']).default('MEMBER'),
});
