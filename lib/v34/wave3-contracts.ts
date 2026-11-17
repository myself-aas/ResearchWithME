/**
 * ResearchWithME v3.4 Wave 3 Zod Contracts (`lib/v34/wave3-contracts.ts`).
 *
 * Covers §6 Informal Discussions, §8 Global Tool Repository & Software Source
 * Links, §9 Project Working Notes, §10 Notifications / Attention / Assistant
 * Tasks separation, §11 Event-Fact Recognition Ledger, and §13–14 Dashboard
 * Landing & Topic Follow Preferences.
 */
import { z } from 'zod';

export const DISCUSSION_OBJECT_TYPES = [
  'contribution',
  'source',
  'project',
  'claim',
  'tool',
] as const;

export const TOOL_PROVIDERS = ['github', 'gitlab', 'huggingface', 'other'] as const;

export const ATTENTION_KINDS = [
  'DRAFT_CONFLICT',
  'RETRACTION_IMPACT',
  'REVIEW_DEADLINE',
  'PERMISSION_ISSUE',
  'UNRESOLVED_CITATION',
  'ASSISTANT',
] as const;

export const ATTENTION_SEVERITIES = ['INFO', 'WARNING', 'CRITICAL'] as const;
export const ATTENTION_STATUSES = ['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED'] as const;

export const ASSISTANT_TASK_TYPES = [
  'compare-sources',
  'suggest-citations',
  'summarize-method',
  'draft-perspective',
] as const;

export const RECOGNITION_EVENT_TYPES = [
  'CONTRIBUTION_REFERENCED',
  'REVIEW_HELPFUL',
  'EVIDENCE_REUSED',
  'CORRECTION_ACCEPTED',
  'REPLICATION_REPORTED',
  'REVIEW_COMPLETED',
] as const;

export const DEFAULT_LANDING_OPTIONS = ['DASHBOARD', 'FEED', 'LIBRARY', 'PROJECTS'] as const;

export type DiscussionObjectType = (typeof DISCUSSION_OBJECT_TYPES)[number];
export type ToolProvider = (typeof TOOL_PROVIDERS)[number];
export type AttentionKind = (typeof ATTENTION_KINDS)[number];
export type AttentionSeverity = (typeof ATTENTION_SEVERITIES)[number];
export type AttentionStatus = (typeof ATTENTION_STATUSES)[number];
export type AssistantTaskType = (typeof ASSISTANT_TASK_TYPES)[number];
export type RecognitionEventType = (typeof RECOGNITION_EVENT_TYPES)[number];
export type DefaultLanding = (typeof DEFAULT_LANDING_OPTIONS)[number];

// §6 Informal Discussions
export const CreateDiscussionInputSchema = z.object({
  objectType: z.enum(DISCUSSION_OBJECT_TYPES),
  objectId: z.string().trim().min(1).max(120),
  title: z.string().trim().min(4).max(180),
  initialBody: z.string().trim().min(2).max(4_000).optional(),
});

export const CreateDiscussionCommentInputSchema = z.object({
  body: z.string().trim().min(2).max(4_000),
  parentCommentId: z.string().trim().min(1).max(120).optional(),
});

export const UpdateDiscussionCommentInputSchema = z.object({
  commentId: z.string().trim().min(1).max(120),
  body: z.string().trim().min(2).max(4_000),
});

export const LockDiscussionInputSchema = z.object({
  locked: z.boolean(),
  reason: z.string().trim().max(500).optional(),
});

// §8 Global Tool Repository & Software Source Links
export const RegisterToolRepositoryInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  provider: z.enum(TOOL_PROVIDERS).default('github'),
  ownerName: z.string().trim().min(1).max(100),
  repoName: z.string().trim().min(1).max(120),
  repositoryUrl: z.string().trim().url().max(500),
  summary: z.string().trim().min(5).max(1_000),
  license: z.string().trim().max(80).optional(),
  primaryLanguage: z.string().trim().max(60).optional(),
  topics: z.array(z.string().trim().min(1).max(60)).max(8).default([]),
  starsCount: z.number().int().min(0).max(5_000_000).optional(),
  forksCount: z.number().int().min(0).max(2_000_000).optional(),
  latestReleaseTag: z.string().trim().max(80).optional(),
});

export const LinkToolSourceInputSchema = z.object({
  sourceId: z.string().trim().min(1).max(120),
  releaseTag: z.string().trim().max(80).optional(),
  commitSha: z.string().trim().max(64).optional(),
  packageVersion: z.string().trim().max(80).optional(),
  archivedUrl: z.string().trim().url().max(500).optional(),
});

// §9 Private Project Working Notes
export const CreateProjectNoteInputSchema = z.object({
  title: z.string().trim().min(2).max(160),
  bodyMarkdown: z.string().trim().min(1).max(20_000),
  classification: z.enum(['workspace', 'private', 'public']).default('workspace'),
});

export const UpdateProjectNoteInputSchema = z.object({
  noteId: z.string().trim().min(1).max(120),
  title: z.string().trim().min(2).max(160).optional(),
  bodyMarkdown: z.string().trim().min(1).max(20_000).optional(),
  classification: z.enum(['workspace', 'private', 'public']).optional(),
});

// §10 Notifications, Attention Queue & Assistant Tasks
export const UpdateNotificationInputSchema = z.object({
  id: z.string().trim().min(1).max(120),
  read: z.boolean(),
});

export const UpdateAttentionItemInputSchema = z.object({
  id: z.string().trim().min(1).max(120),
  status: z.enum(ATTENTION_STATUSES),
});

export const CreateAssistantTaskInputSchema = z.object({
  taskType: z.enum(ASSISTANT_TASK_TYPES),
  title: z.string().trim().min(4).max(180),
  explanation: z.string().trim().max(1_000).default(''),
  workspaceId: z.string().trim().max(120).optional(),
  sourceIds: z.array(z.string().trim().min(1).max(120)).max(10).default([]),
});

export const PromoteAssistantTaskInputSchema = z.object({
  explanation: z.string().trim().max(1_000).optional(),
  severity: z.enum(ATTENTION_SEVERITIES).default('INFO'),
});

// §11 Event-Fact Recognition Ledger
export const RecordRecognitionEventInputSchema = z.object({
  recipientHandle: z.string().trim().min(2).max(80),
  recipientUserId: z.string().trim().max(120).optional(),
  eventType: z.enum(RECOGNITION_EVENT_TYPES),
  objectType: z.string().trim().min(2).max(60),
  objectId: z.string().trim().min(1).max(120),
});

export const ReverseRecognitionEventInputSchema = z.object({
  eventId: z.string().trim().min(1).max(120),
  reason: z.string().trim().min(5).max(500),
});

// §13–14 Dashboard Landing Preferences & Topic Follows
export const UpdateDashboardPreferencesInputSchema = z.object({
  defaultLanding: z.enum(DEFAULT_LANDING_OPTIONS).optional(),
  digestFrequency: z.enum(['off', 'daily', 'weekly']).optional(),
  followTopic: z
    .object({
      topicSlug: z.string().trim().min(1).max(80),
      topicLabel: z.string().trim().min(1).max(80),
    })
    .optional(),
  unfollowTopicSlug: z.string().trim().min(1).max(80).optional(),
});
