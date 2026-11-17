/**
 * ResearchWithME v3.4 — SQL-Backed Cursor-Paginated List Readers (Wave 18 P1).
 *
 * Moves primary list reads onto Postgres composite `(created_at DESC, id DESC)`
 * keyset cursor queries via `querySupabaseCursorPage`, falling back cleanly to
 * the in-memory store ONLY in non-strict local/test environments.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AIProvenance, TrustDimensions } from './contracts';
import {
  paginateArrayWithCursor,
  querySupabaseCursorPage,
  type CursorPage,
  type PaginationParams,
} from './pagination';
import {
  listClaims,
  listContributions,
  listEvidence,
  listSources,
  type ClaimRecord,
  type ContributionRecord,
  type EvidenceRecord,
  type SourceRecord,
} from './store';
import { getOptionalAuthSupabase, getOptionalPublicSupabase } from './supabase-sync';
import {
  listFormalReviews,
  listProjects,
  listWorkspaces,
  type FormalReviewRecord,
  type ProjectSummary,
  type WorkspaceRecord,
} from './wave2-store';
import {
  listAttentionItems,
  listNotifications,
  listToolRepositories,
  type AttentionItemRecord,
  type NotificationRecord,
  type ToolRepositoryRecord,
} from './wave3-store';

const DEFAULT_TRUST: TrustDimensions = {
  review: 'not-reviewed',
  replication: 'not-assessed',
  certainty: 'moderate',
  consensus: 'unknown',
  sourceIntegrity: 'active',
  method: 'Contributor structured checklist',
};

function parseTrust(raw: unknown): TrustDimensions {
  if (raw && typeof raw === 'object' && 'review' in raw) {
    return { ...DEFAULT_TRUST, ...(raw as Partial<TrustDimensions>) };
  }
  return DEFAULT_TRUST;
}

async function resolveReadClient(authClient?: SupabaseClient | null): Promise<SupabaseClient | null> {
  if (authClient) return authClient;
  const opt = await getOptionalAuthSupabase();
  if (opt) return opt;
  return getOptionalPublicSupabase();
}

export async function listContributionsPage(
  params: PaginationParams,
  filters: {
    includeDraftsForAuthorId?: string | null;
    type?: ContributionRecord['contributionType'] | 'all';
    topic?: string;
    query?: string;
    authorHandle?: string;
  } = {},
): Promise<CursorPage<ContributionRecord>> {
  // When free-text or topic array filtering is requested, hydrate via canonical filter path
  if (!filters.query && !filters.topic && !filters.includeDraftsForAuthorId) {
    const sb = await resolveReadClient();
    const sqlPage = await querySupabaseCursorPage<Record<string, unknown>, ContributionRecord>(sb, {
      table: 'v34_contributions',
      params,
      filters: {
        lifecycle: 'published',
        ...(filters.type && filters.type !== 'all' ? { contribution_type: filters.type } : {}),
        ...(filters.authorHandle ? { author_handle: filters.authorHandle } : {}),
      },
      mapRow: (row) => ({
        id: String(row.id),
        slug: String(row.slug ?? row.id),
        authorId: row.author_id ? String(row.author_id) : null,
        authorHandle: String(row.author_handle ?? 'researcher'),
        authorName: String(row.author_name ?? 'Researcher'),
        contributionType: String(row.contribution_type ?? 'paper-review') as ContributionRecord['contributionType'],
        title: String(row.title ?? ''),
        subtitle: row.subtitle ? String(row.subtitle) : null,
        summary: String(row.summary ?? ''),
        document: (row.document as ContributionRecord['document']) ?? { version: '1', blocks: [] },
        mdx: String(row.mdx ?? ''),
        primarySourceId: row.primary_source_id ? String(row.primary_source_id) : null,
        primarySourceVersionId: row.primary_source_version_id ? String(row.primary_source_version_id) : null,
        evidenceIds: [],
        claimIds: [],
        topics: Array.isArray(row.topics) ? (row.topics as string[]) : [],
        tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
        limitations: Array.isArray(row.limitations) ? (row.limitations as string[]) : [],
        trustAssessment: parseTrust(row.trust_assessment),
        aiProvenance:
          row.ai_provenance && typeof row.ai_provenance === 'object' && !Array.isArray(row.ai_provenance)
            ? (row.ai_provenance as AIProvenance)
            : null,
        lifecycle: String(row.lifecycle ?? 'published') as ContributionRecord['lifecycle'],
        version: Number(row.version ?? 1),
        recognition: {
          helpfulReviews: 0,
          referenced: 0,
          saved: 0,
          evidenceUsed: 0,
          replications: 0,
        },
        publishedAt: row.published_at ? String(row.published_at) : null,
        createdAt: String(row.created_at ?? new Date().toISOString()),
        updatedAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
      }),
    });
    if (sqlPage) return sqlPage;
  }

  const all = listContributions(filters);
  return paginateArrayWithCursor(all, params, {
    getSortAt: (c) => c.publishedAt ?? c.createdAt,
    getId: (c) => c.id,
  });
}

export async function listSourcesPage(params: PaginationParams): Promise<CursorPage<SourceRecord>> {
  const sb = await resolveReadClient();
  const sqlPage = await querySupabaseCursorPage<Record<string, unknown>, SourceRecord>(sb, {
    table: 'v34_sources',
    params,
    mapRow: (row) => ({
      id: String(row.id),
      sourceType: String(row.source_type ?? 'paper') as SourceRecord['sourceType'],
      title: String(row.title ?? ''),
      authors: Array.isArray(row.authors) ? (row.authors as string[]) : [],
      publishedDate: row.published_date ? String(row.published_date) : null,
      venue: row.venue ? String(row.venue) : null,
      canonicalUrl: row.canonical_url ? String(row.canonical_url) : null,
      identifierScheme: row.identifier_scheme ? (String(row.identifier_scheme) as SourceRecord['identifierScheme']) : null,
      identifierValue: row.identifier_value ? String(row.identifier_value) : null,
      accessState: String(row.access_state ?? 'open-access') as SourceRecord['accessState'],
      integrityStatus: String(row.integrity_status ?? 'active') as SourceRecord['integrityStatus'],
      language: String(row.language ?? 'en'),
      createdBy: row.created_by ? String(row.created_by) : null,
      createdAt: String(row.created_at ?? new Date().toISOString()),
      updatedAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
    }),
  });
  if (sqlPage) return sqlPage;

  const all = await listSources();
  return paginateArrayWithCursor(all, params, {
    getSortAt: (s) => s.createdAt,
    getId: (s) => s.id,
  });
}

export async function listEvidencePage(
  params: PaginationParams,
  sourceId?: string,
): Promise<CursorPage<EvidenceRecord>> {
  const sb = await resolveReadClient();
  const sqlPage = await querySupabaseCursorPage<Record<string, unknown>, EvidenceRecord>(sb, {
    table: 'v34_evidence',
    params,
    filters: sourceId ? { source_id: sourceId } : undefined,
      mapRow: (row) => ({
        id: String(row.id),
        sourceId: String(row.source_id),
        sourceVersionId: String(row.source_version_id),
        statement: String(row.statement ?? ''),
        quote: row.quote ? String(row.quote) : null,
        locator: (row.locator as EvidenceRecord['locator']) ?? { kind: 'section', value: 'sec-1' },
        extractionType: String(row.extraction_type ?? 'direct-quote') as EvidenceRecord['extractionType'],
        limitation: row.limitation ? String(row.limitation) : null,
        assessment: parseTrust(row.assessment),
        objectVersion: Number(row.object_version ?? 1),
        createdBy: row.created_by ? String(row.created_by) : null,
        createdAt: String(row.created_at ?? new Date().toISOString()),
        updatedAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
      }),
  });
  if (sqlPage) return sqlPage;

  const all = listEvidence(sourceId);
  return paginateArrayWithCursor(all, params, {
    getSortAt: (e) => e.createdAt,
    getId: (e) => e.id,
  });
}

export async function listClaimsPage(params: PaginationParams): Promise<CursorPage<ClaimRecord>> {
  const sb = await resolveReadClient();
  const sqlPage = await querySupabaseCursorPage<Record<string, unknown>, ClaimRecord>(sb, {
    table: 'v34_claims',
    params,
    mapRow: (row) => ({
      id: String(row.id),
      claimType: String(row.claim_type ?? 'empirical') as ClaimRecord['claimType'],
      statement: String(row.statement ?? ''),
      lifecycle: String(row.lifecycle ?? 'published') as ClaimRecord['lifecycle'],
      assessment: parseTrust(row.assessment),
      objectVersion: Number(row.object_version ?? 1),
      createdBy: row.created_by ? String(row.created_by) : null,
      createdAt: String(row.created_at ?? new Date().toISOString()),
      updatedAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
    }),
  });
  if (sqlPage) return sqlPage;

  const all = listClaims();
  return paginateArrayWithCursor(all, params, {
    getSortAt: (c) => c.createdAt,
    getId: (c) => c.id,
  });
}

export async function listToolsPage(
  params: PaginationParams,
  filters: { query?: string; topic?: string } = {},
): Promise<CursorPage<ToolRepositoryRecord>> {
  const all = await listToolRepositories(filters);
  return paginateArrayWithCursor(all, params, {
    getSortAt: (t) => t.createdAt,
    getId: (t) => t.id,
  });
}

export async function listProjectsPage(
  params: PaginationParams,
  filters: { workspaceId?: string; stage?: ProjectSummary['stage'] | 'all' } = {},
): Promise<CursorPage<ProjectSummary>> {
  const all = await listProjects(filters);
  return paginateArrayWithCursor(all, params, {
    getSortAt: (p) => p.createdAt,
    getId: (p) => p.id,
  });
}

export async function listWorkspacesPage(
  params: PaginationParams,
): Promise<CursorPage<WorkspaceRecord>> {
  const all = await listWorkspaces();
  return paginateArrayWithCursor(all, params, {
    getSortAt: (w) => w.createdAt,
    getId: (w) => w.id,
  });
}

export async function listReviewsPage(
  params: PaginationParams,
  contributionId?: string,
): Promise<CursorPage<FormalReviewRecord>> {
  const all = listFormalReviews(contributionId);
  return paginateArrayWithCursor(all, params, {
    getSortAt: (r) => r.createdAt,
    getId: (r) => r.id,
  });
}

export async function listNotificationsPage(
  params: PaginationParams,
  userId: string,
  supabase?: SupabaseClient | null,
): Promise<CursorPage<NotificationRecord> & { unreadCount: number }> {
  if (supabase) {
    const sqlPage = await querySupabaseCursorPage<Record<string, unknown>, NotificationRecord>(
      supabase,
      {
        table: 'v34_notifications',
        params,
        filters: { user_id: userId },
        mapRow: (row) => ({
          id: String(row.id),
          userId: String(row.user_id),
          kind: String(row.kind ?? 'system') as NotificationRecord['kind'],
          title: String(row.title ?? ''),
          body: String(row.body ?? ''),
          objectType: row.object_type ? String(row.object_type) : null,
          objectId: row.object_id ? String(row.object_id) : null,
          actionHref: row.action_href ? String(row.action_href) : null,
          readAt: row.read_at ? String(row.read_at) : null,
          createdAt: String(row.created_at ?? new Date().toISOString()),
        }),
      },
    );
    if (sqlPage) {
      const unreadCount = sqlPage.items.filter((n) => n.readAt === null).length;
      return { ...sqlPage, unreadCount };
    }
  }

  const all = listNotifications(userId);
  const unreadCount = all.filter((n) => n.readAt === null).length;
  const page = paginateArrayWithCursor(all, params, {
    getSortAt: (n) => n.createdAt,
    getId: (n) => n.id,
  });
  return { ...page, unreadCount };
}

export async function listAttentionPage(
  params: PaginationParams,
  userId: string,
  supabase?: SupabaseClient | null,
): Promise<CursorPage<AttentionItemRecord> & { openCount: number }> {
  if (supabase) {
    const sqlPage = await querySupabaseCursorPage<Record<string, unknown>, AttentionItemRecord>(
      supabase,
      {
        table: 'v34_attention_items',
        params,
        filters: { user_id: userId },
        mapRow: (row) => ({
          id: String(row.id),
          userId: String(row.user_id),
          workspaceId: row.workspace_id ? String(row.workspace_id) : null,
          kind: String(row.kind ?? 'REVIEW_REQUEST') as AttentionItemRecord['kind'],
          severity: String(row.severity ?? 'INFO') as AttentionItemRecord['severity'],
          status: String(row.status ?? 'OPEN') as AttentionItemRecord['status'],
          objectType: String(row.object_type ?? 'contribution'),
          objectId: String(row.object_id ?? ''),
          title: String(row.title ?? ''),
          explanation: String(row.explanation ?? ''),
          actionLabel: String(row.action_label ?? 'Review'),
          actionHref: String(row.action_href ?? '/dashboard'),
          promotedBy: row.promoted_by ? String(row.promoted_by) : null,
          createdAt: String(row.created_at ?? new Date().toISOString()),
          updatedAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
        }),
      },
    );
    if (sqlPage) {
      const openCount = sqlPage.items.filter(
        (i) => i.status === 'OPEN' || i.status === 'ACKNOWLEDGED',
      ).length;
      return { ...sqlPage, openCount };
    }
  }

  const all = listAttentionItems(userId);
  const openCount = all.filter(
    (i) => i.status === 'OPEN' || i.status === 'ACKNOWLEDGED',
  ).length;
  const page = paginateArrayWithCursor(all, params, {
    getSortAt: (a) => a.createdAt,
    getId: (a) => a.id,
  });
  return { ...page, openCount };
}
