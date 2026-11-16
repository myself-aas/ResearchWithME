-- ResearchWithME v3.4 canonical migration
-- Baseline: v3.2 schema plus prior legacy data. PostgreSQL 15+.
-- Strategy: expand -> backfill -> validate -> cut over -> contract.
-- IMPORTANT: run with application writes paused for contract sections, and rehearse on a production-sized clone.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30min';

-- -----------------------------------------------------------------------------
-- 1. ENUMS
-- -----------------------------------------------------------------------------
DO $$ BEGIN CREATE TYPE "ClaimEvidenceType" AS ENUM ('SUPPORTS','CONTRADICTS','QUALIFIES'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TopicRelationType" AS ENUM ('BROADER_THAN','NARROWER_THAN','RELATED_TO','EQUIVALENT_TO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "DiscussionCommentStatus" AS ENUM ('ACTIVE','EDITED','HIDDEN','REMOVED','ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ResearchGoalMetric" AS ENUM ('SOURCES_REVIEWED','CONTRIBUTIONS_PUBLISHED','REVIEWS_COMPLETED','EVIDENCE_ATTACHED','CITATIONS_RESOLVED','MILESTONES_COMPLETED','REPLICATIONS_DOCUMENTED','CUSTOM'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ResearchGoalPeriod" AS ENUM ('ONE_TIME','WEEKLY','MONTHLY','QUARTERLY','CUSTOM'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ResearchGoalStatus" AS ENUM ('ACTIVE','PAUSED','COMPLETED','EXPIRED','ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AlertFrequency" AS ENUM ('IMMEDIATE','DAILY','WEEKLY','MONTHLY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "GraphNodeType" AS ENUM ('SOURCE','EVIDENCE','CLAIM','CONTRIBUTION','TOOL','PROJECT','TOPIC','REVIEW'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "BackgroundJobStatus" AS ENUM ('PENDING','RUNNING','SUCCEEDED','FAILED','CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('RECEIVED','PROCESSING','SUCCEEDED','FAILED','IGNORED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "OutboxEventStatus" AS ENUM ('PENDING','PUBLISHED','FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 2. EXPAND: NEW CANONICAL TABLES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ProjectNote" (
  "id" text PRIMARY KEY,
  "workspaceId" text NOT NULL,
  "projectId" text,
  "authorId" text NOT NULL,
  "title" text,
  "document" jsonb NOT NULL,
  "mdx" text,
  "classification" "DataClassification" NOT NULL DEFAULT 'WORKSPACE',
  "version" integer NOT NULL DEFAULT 1 CHECK ("version" > 0),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "WorkspaceTool" (
  "id" text PRIMARY KEY,
  "workspaceId" text NOT NULL,
  "toolRepositoryId" text NOT NULL,
  "addedBy" text NOT NULL,
  "classification" "DataClassification" NOT NULL DEFAULT 'WORKSPACE',
  "addedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "WorkspaceTool_workspace_tool_key" UNIQUE ("workspaceId","toolRepositoryId")
);

CREATE TABLE IF NOT EXISTS "ClaimEvidence" (
  "claimId" text NOT NULL,
  "evidenceId" text NOT NULL,
  "relationship" "ClaimEvidenceType" NOT NULL,
  "assertedBy" text NOT NULL,
  "assertionMethod" "RelationshipAssertionMethod" NOT NULL DEFAULT 'MANUAL',
  "confidence" decimal(5,4),
  "rationale" text,
  "status" "RelationshipStatus" NOT NULL DEFAULT 'ACCEPTED',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("claimId","evidenceId","relationship"),
  CHECK ("confidence" IS NULL OR ("confidence" >= 0 AND "confidence" <= 1))
);

CREATE TABLE IF NOT EXISTS "ContributionEvidence" (
  "contributionId" text NOT NULL,
  "evidenceId" text NOT NULL,
  "addedBy" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("contributionId","evidenceId")
);

CREATE TABLE IF NOT EXISTS "ContributionClaim" (
  "contributionId" text NOT NULL,
  "claimId" text NOT NULL,
  "addedBy" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("contributionId","claimId")
);

CREATE TABLE IF NOT EXISTS "Topic" (
  "id" text PRIMARY KEY,
  "slug" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "description" text,
  "language" text NOT NULL DEFAULT 'en',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "TopicRelationship" (
  "sourceTopicId" text NOT NULL,
  "targetTopicId" text NOT NULL,
  "type" "TopicRelationType" NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("sourceTopicId","targetTopicId","type"),
  CHECK ("sourceTopicId" <> "targetTopicId")
);

CREATE TABLE IF NOT EXISTS "SourceTopic" (
  "sourceId" text NOT NULL,
  "topicId" text NOT NULL,
  "confidence" decimal(5,4),
  "assignedBy" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("sourceId","topicId"),
  CHECK ("confidence" IS NULL OR ("confidence" >= 0 AND "confidence" <= 1))
);

CREATE TABLE IF NOT EXISTS "ContributionTopic" (
  "contributionId" text NOT NULL,
  "topicId" text NOT NULL,
  "confidence" decimal(5,4),
  PRIMARY KEY ("contributionId","topicId"),
  CHECK ("confidence" IS NULL OR ("confidence" >= 0 AND "confidence" <= 1))
);

CREATE TABLE IF NOT EXISTS "ClaimTopic" (
  "claimId" text NOT NULL,
  "topicId" text NOT NULL,
  "confidence" decimal(5,4),
  PRIMARY KEY ("claimId","topicId"),
  CHECK ("confidence" IS NULL OR ("confidence" >= 0 AND "confidence" <= 1))
);

CREATE TABLE IF NOT EXISTS "ToolTopic" (
  "toolRepositoryId" text NOT NULL,
  "topicId" text NOT NULL,
  "confidence" decimal(5,4),
  PRIMARY KEY ("toolRepositoryId","topicId"),
  CHECK ("confidence" IS NULL OR ("confidence" >= 0 AND "confidence" <= 1))
);

CREATE TABLE IF NOT EXISTS "DiscussionThread" (
  "id" text PRIMARY KEY,
  "workspaceId" text,
  "contributionId" text,
  "sourceId" text,
  "claimId" text,
  "evidenceId" text,
  "createdBy" text NOT NULL,
  "lockedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls("contributionId","sourceId","claimId","evidenceId") = 1)
);

CREATE TABLE IF NOT EXISTS "DiscussionComment" (
  "id" text PRIMARY KEY,
  "threadId" text NOT NULL,
  "authorId" text NOT NULL,
  "parentId" text,
  "body" text NOT NULL CHECK (char_length("body") BETWEEN 1 AND 50000),
  "status" "DiscussionCommentStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "editedAt" timestamptz
);

CREATE TABLE IF NOT EXISTS "ResearchGoal" (
  "id" text PRIMARY KEY,
  "userId" text NOT NULL,
  "workspaceId" text,
  "projectId" text,
  "title" text NOT NULL,
  "description" text,
  "metric" "ResearchGoalMetric" NOT NULL,
  "targetValue" integer NOT NULL CHECK ("targetValue" > 0),
  "currentValue" integer NOT NULL DEFAULT 0 CHECK ("currentValue" >= 0),
  "period" "ResearchGoalPeriod" NOT NULL,
  "startsAt" timestamptz NOT NULL,
  "endsAt" timestamptz,
  "status" "ResearchGoalStatus" NOT NULL DEFAULT 'ACTIVE',
  "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CHECK ("endsAt" IS NULL OR "endsAt" > "startsAt")
);

CREATE TABLE IF NOT EXISTS "ResearchGoalProgress" (
  "id" text PRIMARY KEY,
  "goalId" text NOT NULL,
  "date" timestamptz NOT NULL,
  "value" integer NOT NULL CHECK ("value" >= 0),
  "sourceEvent" text,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ToolSourceLink" (
  "id" text PRIMARY KEY,
  "toolRepositoryId" text NOT NULL,
  "sourceId" text NOT NULL,
  "releaseTag" text,
  "commitSha" text,
  "packageVersion" text,
  "archivedUrl" text,
  "observedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "ToolSourceLink_tool_source_key" UNIQUE ("toolRepositoryId","sourceId")
);

CREATE TABLE IF NOT EXISTS "ProfileMetrics" (
  "profileId" text PRIMARY KEY,
  "helpfulReviews" integer NOT NULL DEFAULT 0,
  "referencedContributions" integer NOT NULL DEFAULT 0,
  "evidenceReuse" integer NOT NULL DEFAULT 0,
  "acceptedCorrections" integer NOT NULL DEFAULT 0,
  "replicationReports" integer NOT NULL DEFAULT 0,
  "completedReviews" integer NOT NULL DEFAULT 0,
  "recalculatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "SavedSearch" (
  "id" text PRIMARY KEY,
  "userId" text NOT NULL,
  "workspaceId" text,
  "name" text NOT NULL,
  "query" text NOT NULL,
  "filters" jsonb,
  "searchMode" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "SavedSearch_user_name_key" UNIQUE ("userId","name")
);

CREATE TABLE IF NOT EXISTS "SearchAlert" (
  "id" text PRIMARY KEY,
  "savedSearchId" text NOT NULL UNIQUE,
  "frequency" "AlertFrequency" NOT NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "lastRunAt" timestamptz,
  "lastTriggeredAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "CitationCollection" (
  "id" text PRIMARY KEY,
  "userId" text NOT NULL,
  "projectId" text,
  "title" text NOT NULL,
  "description" text,
  "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "CitationCollectionItem" (
  "collectionId" text NOT NULL,
  "sourceId" text,
  "contributionId" text,
  "note" text,
  "position" integer NOT NULL CHECK ("position" >= 0),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("collectionId","position"),
  CHECK (num_nonnulls("sourceId","contributionId") = 1)
);

CREATE TABLE IF NOT EXISTS "UserFollow" (
  "followerId" text NOT NULL,
  "followedId" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("followerId","followedId"),
  CHECK ("followerId" <> "followedId")
);
CREATE TABLE IF NOT EXISTS "TopicFollow" ("userId" text NOT NULL,"topicId" text NOT NULL,"createdAt" timestamptz NOT NULL DEFAULT now(),PRIMARY KEY ("userId","topicId"));
CREATE TABLE IF NOT EXISTS "ToolFollow" ("userId" text NOT NULL,"toolRepositoryId" text NOT NULL,"createdAt" timestamptz NOT NULL DEFAULT now(),PRIMARY KEY ("userId","toolRepositoryId"));
CREATE TABLE IF NOT EXISTS "ProjectFollow" ("userId" text NOT NULL,"projectId" text NOT NULL,"createdAt" timestamptz NOT NULL DEFAULT now(),PRIMARY KEY ("userId","projectId"));

CREATE TABLE IF NOT EXISTS "GraphNode" (
  "id" text PRIMARY KEY,
  "workspaceId" text,
  "objectId" text NOT NULL,
  "objectType" "GraphNodeType" NOT NULL,
  "label" text NOT NULL,
  "classification" "DataClassification" NOT NULL DEFAULT 'WORKSPACE',
  "payload" jsonb,
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "GraphNode_type_object_key" UNIQUE ("objectType","objectId")
);
CREATE TABLE IF NOT EXISTS "GraphEdge" (
  "id" text PRIMARY KEY,
  "fromNodeId" text NOT NULL,
  "toNodeId" text NOT NULL,
  "relationshipType" "RelationshipType" NOT NULL,
  "sourceRecordId" text,
  "confidence" decimal(5,4),
  "payload" jsonb,
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CHECK ("fromNodeId" <> "toNodeId"),
  CHECK ("confidence" IS NULL OR ("confidence" >= 0 AND "confidence" <= 1))
);
CREATE UNIQUE INDEX IF NOT EXISTS "GraphEdge_unique_nonnull_source" ON "GraphEdge"("fromNodeId","toNodeId","relationshipType","sourceRecordId") WHERE "sourceRecordId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "GraphEdge_unique_null_source" ON "GraphEdge"("fromNodeId","toNodeId","relationshipType") WHERE "sourceRecordId" IS NULL;

CREATE TABLE IF NOT EXISTS "IdempotencyRecord" (
  "id" text PRIMARY KEY,"key" text NOT NULL,"scope" text NOT NULL,"userId" text NOT NULL,
  "requestHash" text NOT NULL,"statusCode" integer NOT NULL,"response" jsonb NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),"expiresAt" timestamptz NOT NULL,
  CONSTRAINT "IdempotencyRecord_scope_key_key" UNIQUE ("scope","key")
);
CREATE TABLE IF NOT EXISTS "OutboxEvent" (
  "id" text PRIMARY KEY,"type" text NOT NULL,"aggregateId" text NOT NULL,"payload" jsonb NOT NULL,
  "status" "OutboxEventStatus" NOT NULL DEFAULT 'PENDING',"createdAt" timestamptz NOT NULL DEFAULT now(),
  "publishedAt" timestamptz,"attempts" integer NOT NULL DEFAULT 0,"lastError" text
);
CREATE TABLE IF NOT EXISTS "BackgroundJob" (
  "id" text PRIMARY KEY,"type" text NOT NULL,"status" "BackgroundJobStatus" NOT NULL DEFAULT 'PENDING',
  "payload" jsonb NOT NULL,"result" jsonb,"error" text,"attempts" integer NOT NULL DEFAULT 0,
  "runAfter" timestamptz NOT NULL DEFAULT now(),"lockedAt" timestamptz,"completedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),"updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "WebhookDelivery" (
  "id" text PRIMARY KEY,"provider" text NOT NULL,"eventId" text NOT NULL,"eventType" text NOT NULL,
  "payloadHash" text NOT NULL,"status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'RECEIVED',
  "receivedAt" timestamptz NOT NULL DEFAULT now(),"processedAt" timestamptz,"error" text,
  CONSTRAINT "WebhookDelivery_provider_event_key" UNIQUE ("provider","eventId")
);

-- -----------------------------------------------------------------------------
-- 3. FOREIGN KEYS (NOT VALID permits online validation after backfill)
-- -----------------------------------------------------------------------------
ALTER TABLE "ProjectNote" ADD CONSTRAINT "ProjectNote_workspace_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "ProjectNote" ADD CONSTRAINT "ProjectNote_project_fkey" FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE SET NULL NOT VALID;
ALTER TABLE "ProjectNote" ADD CONSTRAINT "ProjectNote_author_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT NOT VALID;
ALTER TABLE "WorkspaceTool" ADD CONSTRAINT "WorkspaceTool_workspace_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "WorkspaceTool" ADD CONSTRAINT "WorkspaceTool_tool_fkey" FOREIGN KEY ("toolRepositoryId") REFERENCES "ToolRepository"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "ClaimEvidence" ADD CONSTRAINT "ClaimEvidence_claim_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "ClaimEvidence" ADD CONSTRAINT "ClaimEvidence_evidence_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE RESTRICT NOT VALID;
ALTER TABLE "ContributionEvidence" ADD CONSTRAINT "ContributionEvidence_contribution_fkey" FOREIGN KEY ("contributionId") REFERENCES "Contribution"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "ContributionEvidence" ADD CONSTRAINT "ContributionEvidence_evidence_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE RESTRICT NOT VALID;
ALTER TABLE "ContributionClaim" ADD CONSTRAINT "ContributionClaim_contribution_fkey" FOREIGN KEY ("contributionId") REFERENCES "Contribution"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "ContributionClaim" ADD CONSTRAINT "ContributionClaim_claim_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE RESTRICT NOT VALID;
ALTER TABLE "TopicRelationship" ADD CONSTRAINT "TopicRelationship_source_fkey" FOREIGN KEY ("sourceTopicId") REFERENCES "Topic"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "TopicRelationship" ADD CONSTRAINT "TopicRelationship_target_fkey" FOREIGN KEY ("targetTopicId") REFERENCES "Topic"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "SourceTopic" ADD CONSTRAINT "SourceTopic_source_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "SourceTopic" ADD CONSTRAINT "SourceTopic_topic_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "ContributionTopic" ADD CONSTRAINT "ContributionTopic_contribution_fkey" FOREIGN KEY ("contributionId") REFERENCES "Contribution"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "ContributionTopic" ADD CONSTRAINT "ContributionTopic_topic_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "ClaimTopic" ADD CONSTRAINT "ClaimTopic_claim_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "ClaimTopic" ADD CONSTRAINT "ClaimTopic_topic_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "ToolTopic" ADD CONSTRAINT "ToolTopic_tool_fkey" FOREIGN KEY ("toolRepositoryId") REFERENCES "ToolRepository"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "ToolTopic" ADD CONSTRAINT "ToolTopic_topic_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "DiscussionThread" ADD CONSTRAINT "DiscussionThread_creator_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT NOT VALID;
ALTER TABLE "DiscussionThread" ADD CONSTRAINT "DiscussionThread_workspace_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "DiscussionThread" ADD CONSTRAINT "DiscussionThread_contribution_fkey" FOREIGN KEY ("contributionId") REFERENCES "Contribution"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "DiscussionThread" ADD CONSTRAINT "DiscussionThread_source_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "DiscussionThread" ADD CONSTRAINT "DiscussionThread_claim_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "DiscussionThread" ADD CONSTRAINT "DiscussionThread_evidence_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "DiscussionComment" ADD CONSTRAINT "DiscussionComment_thread_fkey" FOREIGN KEY ("threadId") REFERENCES "DiscussionThread"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "DiscussionComment" ADD CONSTRAINT "DiscussionComment_author_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT NOT VALID;
ALTER TABLE "DiscussionComment" ADD CONSTRAINT "DiscussionComment_parent_fkey" FOREIGN KEY ("parentId") REFERENCES "DiscussionComment"("id") ON DELETE SET NULL NOT VALID;
ALTER TABLE "ResearchGoal" ADD CONSTRAINT "ResearchGoal_user_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "ResearchGoal" ADD CONSTRAINT "ResearchGoal_workspace_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "ResearchGoal" ADD CONSTRAINT "ResearchGoal_project_fkey" FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "ResearchGoalProgress" ADD CONSTRAINT "ResearchGoalProgress_goal_fkey" FOREIGN KEY ("goalId") REFERENCES "ResearchGoal"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "ToolSourceLink" ADD CONSTRAINT "ToolSourceLink_tool_fkey" FOREIGN KEY ("toolRepositoryId") REFERENCES "ToolRepository"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "ToolSourceLink" ADD CONSTRAINT "ToolSourceLink_source_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "ProfileMetrics" ADD CONSTRAINT "ProfileMetrics_profile_fkey" FOREIGN KEY ("profileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_user_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "SearchAlert" ADD CONSTRAINT "SearchAlert_search_fkey" FOREIGN KEY ("savedSearchId") REFERENCES "SavedSearch"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "CitationCollection" ADD CONSTRAINT "CitationCollection_user_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "CitationCollection" ADD CONSTRAINT "CitationCollection_project_fkey" FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE SET NULL NOT VALID;
ALTER TABLE "CitationCollectionItem" ADD CONSTRAINT "CitationCollectionItem_collection_fkey" FOREIGN KEY ("collectionId") REFERENCES "CitationCollection"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "CitationCollectionItem" ADD CONSTRAINT "CitationCollectionItem_source_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "CitationCollectionItem" ADD CONSTRAINT "CitationCollectionItem_contribution_fkey" FOREIGN KEY ("contributionId") REFERENCES "Contribution"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "UserFollow" ADD CONSTRAINT "UserFollow_follower_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "UserFollow" ADD CONSTRAINT "UserFollow_followed_fkey" FOREIGN KEY ("followedId") REFERENCES "User"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "TopicFollow" ADD CONSTRAINT "TopicFollow_user_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "TopicFollow" ADD CONSTRAINT "TopicFollow_topic_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "ToolFollow" ADD CONSTRAINT "ToolFollow_user_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "ToolFollow" ADD CONSTRAINT "ToolFollow_tool_fkey" FOREIGN KEY ("toolRepositoryId") REFERENCES "ToolRepository"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "ProjectFollow" ADD CONSTRAINT "ProjectFollow_user_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "ProjectFollow" ADD CONSTRAINT "ProjectFollow_project_fkey" FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "GraphEdge" ADD CONSTRAINT "GraphEdge_from_fkey" FOREIGN KEY ("fromNodeId") REFERENCES "GraphNode"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "GraphEdge" ADD CONSTRAINT "GraphEdge_to_fkey" FOREIGN KEY ("toNodeId") REFERENCES "GraphNode"("id") ON DELETE CASCADE NOT VALID;

-- -----------------------------------------------------------------------------
-- 4. INDEXES
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "ProjectNote_workspace_updated_idx" ON "ProjectNote"("workspaceId","updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "ProjectNote_project_idx" ON "ProjectNote"("projectId");
CREATE INDEX IF NOT EXISTS "WorkspaceTool_tool_idx" ON "WorkspaceTool"("toolRepositoryId");
CREATE INDEX IF NOT EXISTS "ClaimEvidence_evidence_relationship_idx" ON "ClaimEvidence"("evidenceId","relationship");
CREATE INDEX IF NOT EXISTS "ContributionEvidence_evidence_idx" ON "ContributionEvidence"("evidenceId");
CREATE INDEX IF NOT EXISTS "ContributionClaim_claim_idx" ON "ContributionClaim"("claimId");
CREATE INDEX IF NOT EXISTS "Topic_name_idx" ON "Topic"("name");
CREATE INDEX IF NOT EXISTS "DiscussionThread_contribution_updated_idx" ON "DiscussionThread"("contributionId","updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "DiscussionThread_source_updated_idx" ON "DiscussionThread"("sourceId","updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "DiscussionComment_thread_created_idx" ON "DiscussionComment"("threadId","createdAt");
CREATE INDEX IF NOT EXISTS "ResearchGoal_user_status_end_idx" ON "ResearchGoal"("userId","status","endsAt");
CREATE UNIQUE INDEX IF NOT EXISTS "ResearchGoalProgress_dedupe_idx" ON "ResearchGoalProgress"("goalId","date",COALESCE("sourceEvent",''));
CREATE INDEX IF NOT EXISTS "SavedSearch_workspace_updated_idx" ON "SavedSearch"("workspaceId","updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "GraphNode_workspace_type_idx" ON "GraphNode"("workspaceId","objectType");
CREATE INDEX IF NOT EXISTS "GraphEdge_to_type_idx" ON "GraphEdge"("toNodeId","relationshipType");
CREATE INDEX IF NOT EXISTS "OutboxEvent_status_created_idx" ON "OutboxEvent"("status","createdAt");
CREATE INDEX IF NOT EXISTS "BackgroundJob_status_run_idx" ON "BackgroundJob"("status","runAfter");
CREATE INDEX IF NOT EXISTS "IdempotencyRecord_expires_idx" ON "IdempotencyRecord"("expiresAt");

COMMIT;

-- -----------------------------------------------------------------------------
-- 5. BACKFILL (run in bounded batches; examples assume cuid-compatible app helpers)
-- -----------------------------------------------------------------------------
-- 5.1 ResearchNote migration. Use application-side CUID generation for new Contribution rows.
-- Shared/published notes -> Contribution(RESEARCH_NOTE); private notes -> ProjectNote.
-- Do not drop ResearchNote until row-count, checksum, and sampling checks pass.

-- 5.2 ToolRepository globalization.
-- Before dropping ToolRepository.workspaceId, create WorkspaceTool from every existing row.
INSERT INTO "WorkspaceTool" ("id","workspaceId","toolRepositoryId","addedBy","classification","addedAt")
SELECT 'wt_' || md5("id" || ':' || "workspaceId"), "workspaceId", "id", "createdBy", "classification", "createdAt"
FROM "ToolRepository"
ON CONFLICT ("workspaceId","toolRepositoryId") DO NOTHING;

-- 5.3 Generic relationship normalization. Only recognized valid object pairs are migrated.
INSERT INTO "ClaimEvidence" ("claimId","evidenceId","relationship","assertedBy","assertionMethod","confidence","rationale","status","createdAt","updatedAt")
SELECT "sourceObjectId", "targetObjectId",
  CASE "type" WHEN 'SUPPORTS' THEN 'SUPPORTS'::"ClaimEvidenceType"
              WHEN 'CONTRADICTS' THEN 'CONTRADICTS'::"ClaimEvidenceType"
              ELSE 'QUALIFIES'::"ClaimEvidenceType" END,
  "assertedBy", "assertionMethod", "confidence", "rationale", "status", "createdAt", "updatedAt"
FROM "KnowledgeRelationship" kr
WHERE kr."sourceObjectType" = 'Claim'
  AND kr."targetObjectType" = 'Evidence'
  AND kr."type" IN ('SUPPORTS','CONTRADICTS','QUALIFIES')
  AND EXISTS (SELECT 1 FROM "Claim" c WHERE c.id = kr."sourceObjectId")
  AND EXISTS (SELECT 1 FROM "Evidence" e WHERE e.id = kr."targetObjectId")
ON CONFLICT DO NOTHING;

-- Unrecognized generic relationships remain in the legacy table and must be triaged before contract.

-- 5.4 Ensure every profile has a metrics cache.
INSERT INTO "ProfileMetrics" ("profileId") SELECT "id" FROM "UserProfile" ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 6. VALIDATION (execute after backfill; each must return zero or expected counts)
-- -----------------------------------------------------------------------------
-- SELECT count(*) FROM "ResearchNote"; compare migrated contribution + project-note counts.
-- SELECT count(*) FROM "KnowledgeRelationship" WHERE NOT migrated/triaged.
-- SELECT count(*) FROM "DiscussionThread" WHERE num_nonnulls("contributionId","sourceId","claimId","evidenceId") <> 1;
-- SELECT count(*) FROM "ResearchGoal" WHERE "targetValue" <= 0 OR "currentValue" < 0;
-- SELECT count(*) FROM "ToolRepository" t LEFT JOIN "WorkspaceTool" wt ON wt."toolRepositoryId"=t.id WHERE wt.id IS NULL;

-- Validate NOT VALID foreign keys in a low-traffic window.
-- ALTER TABLE ... VALIDATE CONSTRAINT ...; perform for each constraint above.

-- -----------------------------------------------------------------------------
-- 7. CONTRACT (separate release after dual-write and verification)
-- -----------------------------------------------------------------------------
-- BEGIN;
-- ALTER TABLE "ToolRepository" DROP CONSTRAINT IF EXISTS "ToolRepository_workspaceId_fkey";
-- ALTER TABLE "ToolRepository" DROP COLUMN IF EXISTS "workspaceId";
-- ALTER TABLE "ToolRepository" DROP COLUMN IF EXISTS "classification";
-- DROP TABLE "Follow";                -- only after explicit follow tables are backfilled
-- DROP TABLE "ResearchNote";          -- only after note migration is certified
-- DROP TABLE "KnowledgeRelationship"; -- only after normalization/triage and graph rebuild
-- COMMIT;

-- Rollback principle: expand objects are additive; disable v3.4 feature flags, stop dual writes,
-- restore reads to legacy tables, and only drop additive tables after confirming no v3.4-only data.
