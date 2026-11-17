import { z } from 'zod';
import { DATA_CLASSIFICATIONS } from './wave6-contracts';

const DataClassificationSchema = z.enum(DATA_CLASSIFICATIONS);

// ── Part VII §4: Contribution <-> Canonical Evidence / Claim Links ─────────

export const ContributionLinkEvidenceInputSchema = z.object({
  evidenceId: z.string().trim().min(1).max(160),
});

export const ContributionLinkClaimInputSchema = z.object({
  claimId: z.string().trim().min(1).max(160),
});

// ── Part V §6.7: Relationship curation & update ────────────────────────────

export const UpdateRelationshipInputSchema = z.object({
  status: z.enum(['PROPOSED', 'ACCEPTED', 'REJECTED']).optional(),
  rationale: z.string().trim().min(1).max(1000).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

// ── Part VI §13: Discussion comment edit ───────────────────────────────────

export const UpdateDiscussionCommentInputSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

// ── Part V §6.9: Formal Review update & verdict submission ─────────────────

export const UpdateReviewInputSchema = z.object({
  scope: z.string().trim().min(2).max(240).optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'SUBMITTED', 'RESOLVED', 'WITHDRAWN']).optional(),
  dueAt: z.string().datetime().nullable().optional(),
});

export const SubmitReviewVerdictInputSchema = z.object({
  recommendation: z.enum(['ACCEPT', 'MINOR_REVISION', 'MAJOR_REVISION', 'REJECT']),
  summary: z.string().trim().min(4).max(4000),
});

// ── Part V §6.2: Workspace update ──────────────────────────────────────────

export const UpdateWorkspaceInputSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(1200).optional(),
  visibility: z.enum(['private', 'workspace', 'public']).optional(),
  defaultClassification: DataClassificationSchema.optional(),
});

// ── Part V §6.6: Tool Repository import & update ───────────────────────────

export const ImportToolRepoInputSchema = z.object({
  repoUrl: z.string().trim().url().max(500),
  name: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(1200).optional(),
  license: z.string().trim().max(120).optional(),
  primaryLanguage: z.string().trim().max(80).optional(),
  topics: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
});

export const UpdateToolRepoInputSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(1200).optional(),
  license: z.string().trim().max(120).nullable().optional(),
  primaryLanguage: z.string().trim().max(80).nullable().optional(),
  defaultBranch: z.string().trim().max(80).optional(),
  latestTag: z.string().trim().max(80).nullable().optional(),
  stars: z.number().int().min(0).optional(),
  openIssues: z.number().int().min(0).optional(),
});

// ── Part V §6.11: AI Entailment Check ──────────────────────────────────────

export const CheckEntailmentInputSchema = z.object({
  targetId: z.string().trim().min(1).max(160),
  claimId: z.string().trim().min(1).max(160).optional(),
  claimText: z.string().trim().min(6).max(2000),
  evidenceIds: z.array(z.string().trim().min(1).max(160)).max(20).default([]),
  evidenceExcerpts: z.array(z.string().trim().min(4).max(2000)).max(20).default([]),
  provider: z.string().trim().min(1).max(120).default('local-deterministic'),
  model: z.string().trim().min(1).max(120).default('entailment-verifier-v1'),
  classification: DataClassificationSchema.default('PUBLIC'),
});

// ── Part V §6.12: Devices, Push Subscriptions & Offline Delta Sync ─────────

export const RegisterDeviceInputSchema = z.object({
  label: z.string().trim().min(2).max(120),
  platform: z.enum(['web', 'ios', 'android', 'desktop', 'pwa']).default('web'),
  userAgent: z.string().trim().max(300).optional(),
});

export const RegisterPushSubscriptionInputSchema = z.object({
  deviceId: z.string().trim().min(1).max(160).nullable().optional(),
  endpoint: z.string().trim().url().max(600),
  p256dh: z.string().trim().min(8).max(400),
  authSecret: z.string().trim().min(8).max(400),
  classificationSafePreview: z.boolean().default(true),
});

export const SYNC_RESOURCE_TYPES = [
  'drafts',
  'library',
  'notifications',
  'attention',
  'goals',
  'contributions',
] as const;

export type SyncResourceType = (typeof SYNC_RESOURCE_TYPES)[number];

// ── Part V §6.1: Contributor Profile, Affiliations & Expertise ─────────────

export const AffiliationInputSchema = z.object({
  id: z.string().trim().min(1).max(120).optional(),
  institution: z.string().trim().min(2).max(180),
  roleTitle: z.string().trim().min(2).max(160),
  rorId: z.string().trim().max(120).nullable().optional(),
  startYear: z.number().int().min(1950).max(2100).nullable().optional(),
  endYear: z.number().int().min(1950).max(2100).nullable().optional(),
  isPrimary: z.boolean().default(false),
});

export const ExpertiseInputSchema = z.object({
  topicSlug: z.string().trim().max(120).nullable().optional(),
  label: z.string().trim().min(2).max(120),
  evidenceNote: z.string().trim().max(400).nullable().optional(),
});

export const UpdateProfileInputSchema = z.object({
  displayName: z.string().trim().min(2).max(120).optional(),
  bio: z.string().trim().max(1000).optional(),
  orcidId: z.string().trim().max(40).nullable().optional(),
  githubHandle: z.string().trim().max(80).nullable().optional(),
  affiliations: z.array(AffiliationInputSchema).max(12).optional(),
  expertise: z.array(ExpertiseInputSchema).max(20).optional(),
});

// ── Part V §6.3: Dashboard Module Customization ────────────────────────────

export const DASHBOARD_MODULE_KEYS = [
  'continue-working',
  'attention-queue',
  'notifications',
  'research-goals',
  'active-projects',
  'review-queue',
  'library-summary',
  'assistant-tasks',
  'recognition',
] as const;

export type DashboardModuleKey = (typeof DASHBOARD_MODULE_KEYS)[number];

export const UpdateDashboardModuleInputSchema = z.object({
  pinned: z.boolean().optional(),
  collapsed: z.boolean().optional(),
  hidden: z.boolean().optional(),
  order: z.number().int().min(0).max(50).optional(),
});
