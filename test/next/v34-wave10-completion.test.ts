import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  normalizeScholarlyIdentifier,
  verifyIsbnChecksum,
  verifyIssnChecksum,
  verifyOrcidChecksum,
} from '@/lib/v34/identifiers';
import { serializeResearchDocumentToMdx } from '@/lib/v34/contracts';
import { validateAndSanitizeMdx } from '@/lib/v34/mdx-security';

const ROOT = process.cwd();

/**
 * Explicit canonical mapping of all 83 models in ResearchWithME-v3.4-schema.prisma
 * to their authoritative Supabase SQL table (built-in auth.users/profiles or public.v34_*).
 */
const PRISMA_MODEL_TO_SQL_TABLE: Record<string, string> = {
  User: 'auth.users',
  UserProfile: 'public.profiles',
  ProfileAffiliation: 'v34_user_affiliations',
  ProfileExpertise: 'v34_user_expertise',
  Workspace: 'v34_workspaces',
  WorkspaceMember: 'v34_workspace_members',
  DashboardPreference: 'v34_dashboard_preferences',
  DashboardModulePreference: 'v34_dashboard_preferences',
  LibraryCollection: 'v34_library_collections',
  LibraryItem: 'v34_library_items',
  ToolRepository: 'v34_tool_repositories',
  WorkspaceTool: 'v34_workspace_tools',
  ProjectNote: 'v34_project_notes',
  ResearchProject: 'v34_projects',
  ProjectMember: 'v34_project_members',
  ProjectMilestone: 'v34_project_milestones',
  ProjectTask: 'v34_project_tasks',
  ProjectObject: 'v34_project_objects',
  Source: 'v34_sources',
  SourceVersion: 'v34_source_versions',
  ExternalIdentifier: 'v34_external_identifiers',
  SourceContributor: 'v34_source_contributors',
  IntegrityEvent: 'v34_integrity_events',
  IntegrityImpactRecord: 'v34_integrity_impact_records',
  Evidence: 'v34_evidence',
  EvidenceAssessment: 'v34_evidence_assessments',
  Claim: 'v34_claims',
  ClaimAssessment: 'v34_claim_assessments',
  Contribution: 'v34_contributions',
  ContributionVersion: 'v34_contribution_versions',
  Citation: 'v34_citations',
  Review: 'v34_reviews',
  ReviewItem: 'v34_review_items',
  Rebuttal: 'v34_review_rebuttals',
  Decision: 'v34_review_decisions',
  Draft: 'v34_drafts',
  DraftSnapshot: 'v34_draft_snapshots',
  PendingMutation: 'v34_pending_mutations',
  Annotation: 'v34_annotations',
  AIProvenance: 'v34_ai_provenance_records',
  AssistantTask: 'v34_assistant_tasks',
  ContributionImpactDaily: 'v34_contribution_impact_daily',
  ReputationEvent: 'v34_recognition_events',
  UserActivityEvent: 'v34_user_activity_events',
  AttentionItem: 'v34_attention_items',
  UserNotification: 'v34_notifications',
  NotificationDelivery: 'v34_notification_deliveries',
  ResearchActivityDay: 'v34_research_activity_days',
  AuditEvent: 'v34_audit_events',
  UserDevice: 'v34_user_devices',
  MobileExperiencePreference: 'v34_mobile_experience_preferences',
  MobileDashboardModulePreference: 'v34_mobile_dashboard_module_preferences',
  PushSubscription: 'v34_push_subscriptions',
  DeviceSyncCursor: 'v34_device_sync_cursors',
  ClaimEvidence: 'v34_claim_evidence',
  ContributionEvidence: 'v34_contribution_evidence',
  ContributionClaim: 'v34_contribution_claims',
  Topic: 'v34_topics',
  TopicRelationship: 'v34_topic_relationships',
  SourceTopic: 'v34_source_topics',
  ContributionTopic: 'v34_contribution_topics',
  ClaimTopic: 'v34_claim_topics',
  ToolTopic: 'v34_tool_topics',
  DiscussionThread: 'v34_discussions',
  DiscussionComment: 'v34_discussion_comments',
  ResearchGoal: 'v34_research_goals',
  ResearchGoalProgress: 'v34_goal_progress_events',
  ToolSourceLink: 'v34_tool_source_links',
  ProfileMetrics: 'v34_profile_metrics',
  SavedSearch: 'v34_saved_searches',
  SearchAlert: 'v34_search_alerts',
  CitationCollection: 'v34_citation_collections',
  CitationCollectionItem: 'v34_citation_collection_items',
  UserFollow: 'v34_user_follows',
  TopicFollow: 'v34_topic_follows',
  ToolFollow: 'v34_tool_follows',
  ProjectFollow: 'v34_project_follows',
  GraphNode: 'v34_graph_nodes',
  GraphEdge: 'v34_graph_edges',
  IdempotencyRecord: 'v34_idempotency_keys',
  OutboxEvent: 'v34_outbox_events',
  BackgroundJob: 'v34_background_jobs',
  WebhookDelivery: 'v34_webhook_deliveries',
};

describe('v3.4 Wave 10 — 100% Prisma/SQL Parity, 14-Scheme Identifiers, Multilingual/RTL Safety & Logout Wipe', () => {
  it('enforces Part VIII §A: 83 Prisma models, 87 enums, zero forbidden legacy models, and 100% Supabase SQL coverage', () => {
    const prisma = readFileSync(join(ROOT, 'ResearchWithME-v3.4-schema.prisma'), 'utf8');
    const models = [...prisma.matchAll(/^model\s+(\w+)/gm)].map((m) => m[1]);
    const enums = [...prisma.matchAll(/^enum\s+(\w+)/gm)].map((m) => m[1]);

    expect(models).toHaveLength(83);
    expect(enums).toHaveLength(87);
    expect(new Set(models).size).toBe(83);
    expect(new Set(enums).size).toBe(87);

    // Forbidden legacy canonical models per Part VIII §A
    expect(models).not.toContain('ResearchNote');
    expect(models).not.toContain('Follow');
    expect(models).not.toContain('KnowledgeRelationship');

    // Collect every v34_* table created across all ordered migrations (10+ including operational index hardening)
    const migrationFiles = readdirSync(join(ROOT, 'supabase/migrations'))
      .filter((f) => f.includes('_v34_'))
      .sort();
    expect(migrationFiles.length).toBeGreaterThanOrEqual(10);

    const sqlTables = new Set<string>();
    let allSql = '';
    for (const file of migrationFiles) {
      const sql = readFileSync(join(ROOT, 'supabase/migrations', file), 'utf8');
      allSql += `\n${sql}`;
      for (const hit of sql.matchAll(/CREATE TABLE IF NOT EXISTS\s+public\.(\w+)/gi)) {
        sqlTables.add(hit[1]);
      }
    }

    // Verify every single one of the 83 Prisma models maps to an existing SQL table
    for (const model of models) {
      const target = PRISMA_MODEL_TO_SQL_TABLE[model];
      expect(target, `Missing SQL mapping for Prisma model ${model}`).toBeTruthy();
      if (target.startsWith('v34_')) {
        expect(sqlTables.has(target), `Missing SQL table ${target} for Prisma model ${model}`).toBe(true);
      }
    }

    // Verify Part VII §3 CHECK constraints exist in Migration 9
    for (const constraint of [
      'chk_v34_claim_evidence_confidence_range',
      'chk_v34_user_follows_no_self',
      'chk_v34_graph_edges_no_self',
      'chk_v34_research_goals_positive_target',
      'chk_v34_citation_collection_item_single_target',
      'chk_v34_discussions_target_nonempty',
    ]) {
      expect(allSql).toContain(constraint);
    }
  });

  it('normalizes and validates all 14 Part V §18.9 academic & repository identifier schemes', () => {
    expect(normalizeScholarlyIdentifier('https://doi.org/10.1038/s41586-024-00001-1')).toMatchObject({
      scheme: 'doi',
      value: '10.1038/s41586-024-00001-1',
      checksumValid: true,
    });

    // ORCID valid (Josiah Carberry official test ORCID) & invalid checksum
    expect(normalizeScholarlyIdentifier('https://orcid.org/0000-0002-1825-0097')).toMatchObject({
      scheme: 'orcid',
      value: '0000-0002-1825-0097',
      checksumValid: true,
    });
    expect(verifyOrcidChecksum('0000-0002-1825-0098')).toBe(false);

    // PMID & PMCID
    expect(normalizeScholarlyIdentifier('PMID:39123456')).toMatchObject({
      scheme: 'pmid',
      value: '39123456',
    });
    expect(normalizeScholarlyIdentifier('https://pmc.ncbi.nlm.nih.gov/articles/PMC10987654/')).toMatchObject({
      scheme: 'pmcid',
      value: 'PMC10987654',
    });

    // ISBN-13 & ISBN-10 check digits
    expect(normalizeScholarlyIdentifier('ISBN: 978-0-306-40615-7')).toMatchObject({
      scheme: 'isbn',
      value: '9780306406157',
      checksumValid: true,
    });
    expect(verifyIsbnChecksum('0-306-40615-2')).toBe(true);
    expect(verifyIsbnChecksum('9780306406158')).toBe(false);

    // ISSN check digit (Nature)
    expect(normalizeScholarlyIdentifier('ISSN 1476-4687')).toMatchObject({
      scheme: 'issn',
      value: '1476-4687',
      checksumValid: true,
    });
    expect(verifyIssnChecksum('1476-4688')).toBe(false);

    // Modern & legacy arXiv
    expect(normalizeScholarlyIdentifier('arXiv:2501.12948v2')).toMatchObject({
      scheme: 'arxiv',
      value: '2501.12948v2',
    });
    expect(normalizeScholarlyIdentifier('https://arxiv.org/abs/hep-th/9901001')).toMatchObject({
      scheme: 'arxiv',
      value: 'hep-th/9901001',
    });

    // ROR, RRID, Accession, SWHID, GitHub, GitLab
    expect(normalizeScholarlyIdentifier('https://ror.org/02mhbdp94')).toMatchObject({
      scheme: 'ror',
      value: '02mhbdp94',
    });
    expect(normalizeScholarlyIdentifier('RRID:SCR_001905')).toMatchObject({
      scheme: 'rrid',
      value: 'RRID:SCR_001905',
    });
    expect(normalizeScholarlyIdentifier('GSE241234')).toMatchObject({
      scheme: 'accession',
      value: 'GSE241234',
      inferredType: 'dataset',
    });
    expect(
      normalizeScholarlyIdentifier('swh:1:rev:309cf2674ee7a0749978cf8265ab91a60aea0f7d'),
    ).toMatchObject({
      scheme: 'swhid',
      inferredType: 'software',
    });
    expect(normalizeScholarlyIdentifier('https://github.com/vllm-project/vllm.git')).toMatchObject({
      scheme: 'github',
      value: 'vllm-project/vllm',
    });
    expect(normalizeScholarlyIdentifier('https://gitlab.com/open-science/repro-bench')).toMatchObject({
      scheme: 'gitlab',
      value: 'open-science/repro-bench',
    });

    // URL strips marketing tracking parameters
    const cleaned = normalizeScholarlyIdentifier(
      'https://example.org/paper?id=42&utm_source=twitter&fbclid=abc123',
    );
    expect(cleaned).toMatchObject({
      scheme: 'url',
      canonicalUrl: 'https://example.org/paper?id=42',
    });
  });

  it('preserves Bangla, Arabic RTL, and mixed-script scholarly text cleanly through MDX serialization & sanitization (Part VIII §D)', () => {
    const doc = {
      schemaVersion: '1.0' as const,
      id: 'draft-multilingual-1',
      title: 'গবেষণা প্রতিলিপি: Multilingual Reasoning Study (دراسة استدلال متعدد اللغات)',
      authorId: 'user-1',
      workspaceId: 'personal',
      version: 1,
      createdAt: '2026-11-16T00:00:00.000Z',
      updatedAt: '2026-11-16T00:00:00.000Z',
      blocks: [
        {
          id: 'blk-bn',
          type: 'evidence' as const,
          sourceId: 'src-arxiv-2501-12948',
          locator: 'Table 2, p. 14',
          text: 'বাংলা এবং English মিশ্র পাঠে DOI 10.1038/s41586-024-00001-1 নির্ভুলভাবে সংরক্ষিত থাকে।',
        },
        {
          id: 'blk-rtl',
          type: 'limitation' as const,
          text: 'تقتصر العينة التجريبية على ثلاث مجموعات بيانات مفتوحة المصدر (n = 1,240).',
        },
      ],
    };

    const mdx = serializeResearchDocumentToMdx(doc);
    const check = validateAndSanitizeMdx(mdx);

    expect(check.safe).toBe(true);
    expect(check.sanitizedMdx).toContain('গবেষণা প্রতিলিপি');
    expect(check.sanitizedMdx).toContain('دراسة استدلال متعدد اللغات');
    expect(check.sanitizedMdx).toContain('10.1038/s41586-024-00001-1');
  });

  it('wires Part V §15.3 automatic local wipe into browser sign-out handlers', () => {
    const useSessionSrc = readFileSync(join(ROOT, 'lib/supabase/use-session.ts'), 'utf8');
    const dashShellSrc = readFileSync(join(ROOT, 'components/cms/DashboardShell.tsx'), 'utf8');

    expect(useSessionSrc).toContain('performLogoutLocalWipe');
    expect(dashShellSrc).toContain('performLogoutLocalWipe');
  });
});
