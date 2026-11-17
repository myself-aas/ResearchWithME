/**
 * ResearchWithME v3.4 Wave 2 Zod Contracts (`lib/v34/wave2-contracts.ts`).
 *
 * Covers Collaborative Workspaces & Projects (§7), Formal Peer Review,
 * Rebuttals & Decisions (§6), and Claim–Evidence Edge Curation (§26).
 */
import { z } from 'zod';

export const WORKSPACE_ROLES = [
  'OWNER',
  'ADMIN',
  'EDITOR',
  'CONTRIBUTOR',
  'REVIEWER',
  'VIEWER',
] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const PROJECT_STAGES = [
  'SCOPING',
  'LITERATURE_REVIEW',
  'EXPERIMENTATION',
  'SYNTHESIS',
  'UNDER_REVIEW',
  'PUBLISHED',
  'ARCHIVED',
] as const;

export type ProjectStage = (typeof PROJECT_STAGES)[number];

export const MILESTONE_STATUSES = [
  'PLANNED',
  'IN_PROGRESS',
  'BLOCKED',
  'COMPLETED',
] as const;

export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export const REVIEW_DECISION_OUTCOMES = [
  'ACCEPT',
  'MINOR_REVISION',
  'MAJOR_REVISION',
  'REJECT',
] as const;

export type ReviewDecisionOutcome = (typeof REVIEW_DECISION_OUTCOMES)[number];

export const CreateWorkspaceInputSchema = z.object({
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1_000).default(''),
  visibility: z.enum(['public', 'workspace', 'private']).default('public'),
});

export const AddWorkspaceMemberInputSchema = z.object({
  userId: z.string().trim().min(1).max(120),
  handle: z.string().trim().min(2).max(60),
  displayName: z.string().trim().min(2).max(120),
  role: z.enum(WORKSPACE_ROLES).default('CONTRIBUTOR'),
});

export const CreateProjectInputSchema = z.object({
  workspaceId: z.string().trim().min(1).max(120),
  title: z.string().trim().min(4).max(180),
  objective: z.string().trim().min(15).max(1_500),
  stage: z.enum(PROJECT_STAGES).default('SCOPING'),
  visibility: z.enum(['public', 'workspace', 'private']).default('public'),
  topics: z.array(z.string().trim().min(1).max(60)).max(8).default([]),
});

export const UpdateProjectInputSchema = z.object({
  title: z.string().trim().min(4).max(180).optional(),
  objective: z.string().trim().min(15).max(1_500).optional(),
  stage: z.enum(PROJECT_STAGES).optional(),
  visibility: z.enum(['public', 'workspace', 'private']).optional(),
  topics: z.array(z.string().trim().min(1).max(60)).max(8).optional(),
});

export const AddProjectMemberInputSchema = z.object({
  userId: z.string().trim().min(1).max(120),
  role: z.enum(WORKSPACE_ROLES).default('CONTRIBUTOR'),
});

export const CreateMilestoneInputSchema = z.object({
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().max(1_000).default(''),
  status: z.enum(MILESTONE_STATUSES).default('PLANNED'),
  dueAt: z.string().datetime().optional(),
});

export const UpdateMilestoneInputSchema = z.object({
  milestoneId: z.string().trim().min(1).max(120),
  title: z.string().trim().min(3).max(180).optional(),
  status: z.enum(MILESTONE_STATUSES).optional(),
});

export const LinkProjectObjectInputSchema = z.object({
  objectType: z.enum(['source', 'evidence', 'claim', 'contribution']),
  objectId: z.string().trim().min(1).max(120),
});

export const CreateReviewInputSchema = z.object({
  contributionId: z.string().trim().min(1).max(120),
  scope: z.string().trim().min(3).max(200).default('Full contribution'),
  anonymous: z.boolean().default(false),
  initialItem: z
    .object({
      itemType: z.enum(['review', 'suggestion', 'comment']).default('review'),
      body: z.string().trim().min(5).max(4_000),
      scope: z.string().trim().max(200).optional(),
    })
    .optional(),
});

export const CreateReviewItemInputSchema = z.object({
  itemType: z.enum(['review', 'suggestion', 'comment']).default('review'),
  scope: z.string().trim().max(200).optional(),
  body: z.string().trim().min(5).max(4_000),
  anonymous: z.boolean().default(false),
});

export const UpdateReviewItemInputSchema = z.object({
  itemId: z.string().trim().min(1).max(120),
  status: z.enum(['open', 'accepted', 'rejected', 'resolved']),
});

export const CreateRebuttalInputSchema = z.object({
  reviewItemIds: z.array(z.string().trim().min(1).max(120)).min(1),
  body: z.string().trim().min(5).max(4_000),
});

export const CreateDecisionInputSchema = z.object({
  outcome: z.enum(REVIEW_DECISION_OUTCOMES),
  rationale: z.string().trim().min(10).max(2_000),
});

export const UpdateClaimEvidenceStatusInputSchema = z.object({
  claimId: z.string().trim().min(1).max(120),
  evidenceId: z.string().trim().min(1).max(120),
  relationship: z.enum(['SUPPORTS', 'CONTRADICTS', 'QUALIFIES']),
  status: z.enum(['ACCEPTED', 'REJECTED']),
  rationale: z.string().trim().max(1_000).optional(),
});
