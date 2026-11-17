/**
 * ResearchWithME v3.4 Wave 5 Zod Contracts (`lib/v34/wave5-contracts.ts`).
 *
 * Covers remaining Part VI §12–13 & Part VII §1–4 canonical contracts:
 *  - First-class Topics & FK-backed Topic Assignments
 *  - WorkspaceTool access bridge to global ToolRepository
 *  - Saved Searches & Alerts
 *  - Citation Collections & Single-Target Collection Items
 *  - Source Versions, Claim updates & direct Claim-Evidence linking
 *  - Research Goal lifecycle (pause / resume / archive) & validated progress events
 */
import { z } from 'zod';
import { TrustDimensionsSchema } from './contracts';

export const TOPIC_TARGET_TYPES = ['contribution', 'source', 'project', 'tool'] as const;
export const ALERT_CADENCES = ['off', 'daily', 'weekly'] as const;
export const COLLECTION_VISIBILITIES = ['private', 'workspace', 'public'] as const;

export type TopicTargetType = (typeof TOPIC_TARGET_TYPES)[number];
export type AlertCadence = (typeof ALERT_CADENCES)[number];
export type CollectionVisibility = (typeof COLLECTION_VISIBILITIES)[number];

// Topics & FK-backed Topic Assignments
export const CreateTopicInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case')
    .optional(),
  description: z.string().trim().max(500).default(''),
  parentTopicId: z.string().trim().max(120).optional().nullable(),
});

export const AssignTopicInputSchema = z.object({
  topicId: z.string().trim().min(1).max(120),
  targetType: z.enum(TOPIC_TARGET_TYPES),
  targetId: z.string().trim().min(1).max(120),
});

// WorkspaceTool bridge
export const LinkWorkspaceToolInputSchema = z.object({
  toolRepositoryId: z.string().trim().min(1).max(120),
  pinned: z.boolean().default(false),
  notes: z.string().trim().max(500).default(''),
});

// Saved Searches & Alerts
export const CreateSavedSearchInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  query: z.string().trim().min(1).max(300),
  filters: z.record(z.string(), z.unknown()).default({}),
  alertCadence: z.enum(ALERT_CADENCES).default('weekly'),
});

export const UpdateSavedSearchInputSchema = z.object({
  id: z.string().trim().min(1).max(120),
  name: z.string().trim().min(2).max(120).optional(),
  query: z.string().trim().min(1).max(300).optional(),
  alertCadence: z.enum(ALERT_CADENCES).optional(),
  markRun: z.boolean().optional(),
});

// Citation Collections & Single-Target Collection Items (Part VII §3)
export const CreateCitationCollectionInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(600).default(''),
  workspaceId: z.string().trim().max(120).optional().nullable(),
  visibility: z.enum(COLLECTION_VISIBILITIES).default('private'),
});

export const AddCitationCollectionItemInputSchema = z
  .object({
    collectionId: z.string().trim().min(1).max(120),
    sourceId: z.string().trim().min(1).max(120).optional().nullable(),
    contributionId: z.string().trim().min(1).max(120).optional().nullable(),
    evidenceId: z.string().trim().min(1).max(120).optional().nullable(),
    note: z.string().trim().max(500).default(''),
  })
  .refine(
    (data) => {
      const count = [data.sourceId, data.contributionId, data.evidenceId].filter(
        (v) => typeof v === 'string' && v.length > 0,
      ).length;
      return count === 1;
    },
    {
      message:
        'A citation collection item must target exactly one object: sourceId, contributionId, or evidenceId (v3.4 Part VII §3).',
    },
  );

// Source Versions (Part VI §13)
export const CreateSourceVersionInputSchema = z.object({
  versionLabel: z.string().trim().min(1).max(60),
  releaseDate: z.string().trim().max(40).optional(),
  snapshotUrl: z.string().trim().url().max(500).optional(),
  checksumSha256: z.string().trim().max(128).optional(),
  notes: z.string().trim().max(600).optional(),
});

// Claim Updates & Direct Claim-Evidence Linking (Part VI §13 / Part VII §4)
export const UpdateClaimInputSchema = z.object({
  statement: z.string().trim().min(10).max(1_500).optional(),
  claimType: z
    .enum(['empirical', 'methodological', 'causal', 'comparative', 'normative', 'replication'])
    .optional(),
  assessment: TrustDimensionsSchema.optional(),
});

export const LinkClaimEvidenceInputSchema = z.object({
  evidenceId: z.string().trim().min(1).max(120),
  relationship: z.enum(['SUPPORTS', 'CONTRADICTS', 'QUALIFIES']),
  assertionMethod: z.enum(['MANUAL', 'AI_SUGGESTED', 'IMPORTED']).default('MANUAL'),
  confidence: z.number().min(0).max(1).optional(),
  rationale: z.string().trim().max(1_000).optional(),
});

// Goal Updates & Validated Progress Events (Part VI §12–13)
export const UpdateGoalInputSchema = z.object({
  title: z.string().trim().min(3).max(160).optional(),
  targetValue: z.number().int().min(1).max(500).optional(),
  dueAt: z.string().trim().max(60).optional().nullable(),
});

export const RecordGoalProgressInputSchema = z.object({
  delta: z.number().int().min(1).max(100),
  sourceKind: z
    .enum(['manual-verified', 'contribution-published', 'review-completed', 'source-reviewed', 'evidence-attached'])
    .default('manual-verified'),
  objectType: z.string().trim().max(60).optional(),
  objectId: z.string().trim().max(120).optional(),
  note: z.string().trim().max(400).default(''),
});
