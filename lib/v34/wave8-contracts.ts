import { z } from 'zod';
import { DATA_CLASSIFICATIONS } from './wave6-contracts';

const DataClassificationSchema = z.enum(DATA_CLASSIFICATIONS);

/**
 * Wave 8 Contracts — Part V §6 complete API catalogue parity.
 */

// ── Evidence & Claim Assessments ─────────────────────────────────────────
export const CreateEvidenceAssessmentInputSchema = z.object({
  rigorScore: z.number().int().min(1).max(5),
  verifiabilityScore: z.number().int().min(1).max(5),
  notes: z.string().trim().max(2000).default(''),
});

export const CreateClaimAssessmentInputSchema = z.object({
  evidenceSupportScore: z.number().int().min(1).max(5),
  confidenceLevel: z.enum(['HIGH', 'MODERATE', 'LOW', 'INSUFFICIENT']),
  rationale: z.string().trim().min(5).max(2000),
});

// ── Library Items & Collections ──────────────────────────────────────────
export const CreateLibraryCollectionInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).default(''),
  colorToken: z.enum(['accent', 'info', 'success', 'warning', 'neutral']).default('accent'),
});

export const UpdateLibraryCollectionInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(500).optional(),
    colorToken: z.enum(['accent', 'info', 'success', 'warning', 'neutral']).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update.' });

export const CreateLibraryItemDirectInputSchema = z.object({
  targetType: z.enum(['SOURCE', 'CONTRIBUTION', 'TOOL', 'CLAIM', 'PROJECT']),
  targetId: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(240).optional(),
  state: z.enum(['SAVED', 'TO_READ', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED']).default('SAVED'),
  collectionId: z.string().trim().max(120).nullable().optional(),
  note: z.string().trim().max(1000).default(''),
});

export const UpdateLibraryItemDirectInputSchema = z
  .object({
    state: z.enum(['SAVED', 'TO_READ', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED']).optional(),
    collectionId: z.string().trim().max(120).nullable().optional(),
    note: z.string().trim().max(1000).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update.' });

// ── Projects: Tasks, Milestones, Members ─────────────────────────────────
export const CreateProjectTaskInputSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).default(''),
  assigneeId: z.string().trim().max(120).nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  dueDate: z.string().trim().max(64).nullable().optional(),
});

export const UpdateProjectTaskInputSchema = z
  .object({
    title: z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    assigneeId: z.string().trim().max(120).nullable().optional(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    dueDate: z.string().trim().max(64).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update.' });

export const UpdateProjectMilestoneInputSchema = z
  .object({
    title: z.string().trim().min(2).max(200).optional(),
    status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED']).optional(),
    dueDate: z.string().trim().max(64).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update.' });

export const UpdateProjectMemberRoleInputSchema = z.object({
  role: z.enum(['LEAD', 'RESEARCHER', 'REVIEWER', 'VIEWER']),
});

// ── Workspaces: Members & Access Requests ────────────────────────────────
export const UpdateWorkspaceMemberRoleInputSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'RESEARCHER', 'REVIEWER', 'VIEWER']),
});

export const CreateWorkspaceAccessRequestInputSchema = z.object({
  requestedRole: z.enum(['RESEARCHER', 'REVIEWER', 'VIEWER']).default('RESEARCHER'),
  rationale: z.string().trim().min(5).max(1000),
});

export const DecideWorkspaceAccessRequestInputSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  decisionNote: z.string().trim().max(500).optional(),
});

// ── Sources, Reviews, Discussions, Drafts ────────────────────────────────
export const UpdateSourceInputSchema = z
  .object({
    title: z.string().trim().min(2).max(300).optional(),
    venue: z.string().trim().max(200).optional(),
    year: z.number().int().min(1800).max(2100).nullable().optional(),
    canonicalUrl: z.string().url().max(600).optional(),
    integrityStatus: z.enum(['VERIFIED', 'UNVERIFIED', 'CORRECTED', 'EXPRESSION_OF_CONCERN', 'RETRACTED']).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update.' });

export const UpdateReviewItemInputSchema = z
  .object({
    severity: z.enum(['MAJOR', 'MINOR', 'SUGGESTION', 'PRAISE']).optional(),
    body: z.string().trim().min(3).max(4000).optional(),
    resolved: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update.' });

export const UpdateDiscussionMetadataInputSchema = z.object({
  discussionId: z.string().trim().min(1).max(120),
  title: z.string().trim().min(3).max(200).optional(),
  locked: z.boolean().optional(),
  lockReason: z.string().trim().max(400).optional(),
});

export const CreateDraftSnapshotInputSchema = z.object({
  label: z.string().trim().min(1).max(120).default('Manual milestone snapshot'),
  note: z.string().trim().max(400).optional(),
});

// ── AI Governance Approval / Rejection & Conversational Assistant ────────
export const DecideAiProvenanceInputSchema = z.object({
  provenanceId: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(1000).optional(),
});

export const CreateAssistantSessionInputSchema = z.object({
  title: z.string().trim().min(1).max(160).default('Research assistant session'),
  workspaceId: z.string().trim().max(120).nullable().optional(),
  dataClassification: DataClassificationSchema.default('WORKSPACE'),
  contextSourceIds: z.array(z.string().trim().min(1).max(120)).max(25).default([]),
});

export const CreateAssistantMessageInputSchema = z.object({
  content: z.string().trim().min(1).max(6000),
  provider: z.string().trim().max(80).default('internal-isolated'),
  model: z.string().trim().max(80).default('reme-grounded-v34'),
  sourceIds: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
});

export const UpdateAssistantTaskInputSchema = z
  .object({
    status: z.enum(['PENDING', 'COMPLETED', 'DISMISSED', 'PROMOTED']).optional(),
    title: z.string().trim().min(2).max(200).optional(),
    outputSummary: z.string().trim().max(2000).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update.' });

// ── Devices, Sync Acknowledge, Dashboard Reorder ─────────────────────────
export const UpdateDeviceInputSchema = z
  .object({
    deviceName: z.string().trim().min(1).max(120).optional(),
    pushEnabled: z.boolean().optional(),
    offlineCacheAllowed: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update.' });

export const AcknowledgeSyncInputSchema = z.object({
  deviceId: z.string().trim().min(1).max(120),
  resourceType: z.enum(['library', 'notifications', 'attention', 'goals', 'drafts', 'contributions']),
  cursor: z.string().trim().min(1).max(120),
});

export const ReorderDashboardModulesInputSchema = z.object({
  moduleOrder: z
    .array(
      z.enum([
        'continue_working',
        'attention_queue',
        'active_projects',
        'contribution_pipeline',
        'research_goals',
        'private_activity',
        'identity_snapshot',
        'assistant_tasks',
      ]),
    )
    .min(1)
    .max(12),
});

// ── Identity, Affiliations, Expertise, ORCID/GitHub Connect, Deletion ────
export const CreateAffiliationInputSchema = z.object({
  institution: z.string().trim().min(2).max(160),
  role: z.string().trim().min(2).max(120),
  rorId: z.string().trim().max(120).nullable().optional(),
  startYear: z.number().int().min(1950).max(2100).nullable().optional(),
  endYear: z.number().int().min(1950).max(2100).nullable().optional(),
  primary: z.boolean().default(false),
});

export const UpdateAffiliationInputSchema = z
  .object({
    institution: z.string().trim().min(2).max(160).optional(),
    role: z.string().trim().min(2).max(120).optional(),
    rorId: z.string().trim().max(120).nullable().optional(),
    startYear: z.number().int().min(1950).max(2100).nullable().optional(),
    endYear: z.number().int().min(1950).max(2100).nullable().optional(),
    primary: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update.' });

export const CreateExpertiseInputSchema = z.object({
  topicSlug: z.string().trim().min(1).max(120),
  label: z.string().trim().min(2).max(120),
  level: z.enum(['RESEARCHER', 'DOMAIN_EXPERT', 'MAINTAINER']).default('RESEARCHER'),
});

export const ConnectOrcidInputSchema = z.object({
  orcid: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/, 'ORCID must follow 0000-0000-0000-000X format.'),
});

export const ConnectGithubInputSchema = z.object({
  githubHandle: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/, 'Provide a valid GitHub username.'),
});

export const DeleteAccountInputSchema = z.object({
  confirmationPhrase: z.literal('DELETE MY ACCOUNT'),
  retainCitationTombstones: z.boolean().default(true),
});

// ── Governed Media Renders (Remotion & Hyperframes, Part V §16.3) ────────
export const CreateRenderJobInputSchema = z.object({
  compositionId: z.string().trim().min(2).max(120),
  sourceContributionId: z.string().trim().max(120).nullable().optional(),
  durationSeconds: z.number().int().min(1).max(600).default(30),
  humanApproved: z.boolean().default(false),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export const LinkToolSourceAliasInputSchema = z.object({
  sourceId: z.string().trim().min(1).max(120),
  relation: z.enum(['CITES_RELEASE', 'BENCHMARKS', 'REPLICATES', 'SOFTWARE_CITATION']).default('SOFTWARE_CITATION'),
  releaseTag: z.string().trim().max(80).optional(),
});
