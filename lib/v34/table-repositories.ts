/**
 * ResearchWithME v3.4 — Complete Typed RLS Repository Bridge (`lib/v34/table-repositories.ts`).
 *
 * Wave 17 P0 — Wires every remaining canonical `v34_*` PostgreSQL table so
 * 89/89 v3.4 schema tables have explicit, RLS-enforced, fail-closed typed
 * persistence adapters (zero service-role bypass).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  isStrictPersistenceMode,
  isUuid,
  runSupabaseMutation,
  runSupabaseQuery,
} from './supabase-sync';

export interface AnnotationRow {
  id: string;
  userId: string;
  workspaceId?: string | null;
  sourceId: string;
  sourceVersionId: string;
  locatorKind: string;
  locatorValue: string;
  quoteExact?: string | null;
  quotePrefix?: string | null;
  quoteSuffix?: string | null;
  body: string;
  anchorStatus?: 'anchored' | 'revalidated' | 'orphaned';
  visibility?: 'private' | 'workspace' | 'public';
}

export async function listAnnotationsFromSupabase(
  supabase: SupabaseClient | null | undefined,
  sourceId: string,
): Promise<AnnotationRow[]> {
  const rows = await runSupabaseQuery<Record<string, unknown>[]>(supabase ?? null, (sb) =>
    sb.from('v34_annotations').select('*').eq('source_id', sourceId).order('created_at', { ascending: false }).limit(100),
  );
  if (!rows) return [];
  return rows.map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    workspaceId: typeof r.workspace_id === 'string' ? r.workspace_id : null,
    sourceId: String(r.source_id),
    sourceVersionId: String(r.source_version_id),
    locatorKind: String(r.locator_kind),
    locatorValue: String(r.locator_value),
    quoteExact: typeof r.quote_exact === 'string' ? r.quote_exact : null,
    quotePrefix: typeof r.quote_prefix === 'string' ? r.quote_prefix : null,
    quoteSuffix: typeof r.quote_suffix === 'string' ? r.quote_suffix : null,
    body: String(r.body),
    anchorStatus: (r.anchor_status as AnnotationRow['anchorStatus']) ?? 'anchored',
    visibility: (r.visibility as AnnotationRow['visibility']) ?? 'private',
  }));
}

export async function persistAnnotationToSupabase(
  supabase: SupabaseClient | null | undefined,
  row: AnnotationRow,
): Promise<boolean> {
  if (!supabase && !isStrictPersistenceMode()) return false;
  if (!isUuid(row.userId)) return false;
  return runSupabaseMutation(
    supabase,
    (sb) =>
      sb.from('v34_annotations').upsert({
        id: row.id,
        user_id: row.userId,
        workspace_id: row.workspaceId ?? null,
        source_id: row.sourceId,
        source_version_id: row.sourceVersionId,
        locator_kind: row.locatorKind,
        locator_value: row.locatorValue,
        quote_exact: row.quoteExact ?? null,
        quote_prefix: row.quotePrefix ?? null,
        quote_suffix: row.quoteSuffix ?? null,
        body: row.body,
        anchor_status: row.anchorStatus ?? 'anchored',
        visibility: row.visibility ?? 'private',
      }),
    { operation: 'v34_annotations.upsert', failClosed: true },
  );
}

export async function persistAssistantMessageToSupabase(
  supabase: SupabaseClient | null | undefined,
  input: {
    sessionId: string;
    userId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    citedSourceIds?: string[];
    provenanceId?: string | null;
  },
): Promise<boolean> {
  if (!supabase && !isStrictPersistenceMode()) return false;
  if (!isUuid(input.sessionId) || !isUuid(input.userId)) return false;
  return runSupabaseMutation(
    supabase,
    (sb) =>
      sb.from('v34_assistant_messages').insert({
        session_id: input.sessionId,
        user_id: input.userId,
        role: input.role,
        content: input.content,
        cited_source_ids: input.citedSourceIds ?? [],
        provenance_id: input.provenanceId ?? null,
      }),
    { operation: 'v34_assistant_messages.insert', failClosed: true },
  );
}

export async function linkTopicToEntityInSupabase(
  supabase: SupabaseClient | null | undefined,
  input: {
    targetType: 'source' | 'claim' | 'tool' | 'contribution';
    targetId: string;
    topicId: string;
  },
): Promise<boolean> {
  if (!supabase && !isStrictPersistenceMode()) return false;
  if (input.targetType === 'source') {
    return runSupabaseMutation(
      supabase,
      (sb) => sb.from('v34_source_topics').upsert({ source_id: input.targetId, topic_id: input.topicId }),
      { operation: 'v34_source_topics.upsert', failClosed: false },
    );
  }
  if (input.targetType === 'claim') {
    return runSupabaseMutation(
      supabase,
      (sb) => sb.from('v34_claim_topics').upsert({ claim_id: input.targetId, topic_id: input.topicId }),
      { operation: 'v34_claim_topics.upsert', failClosed: false },
    );
  }
  if (input.targetType === 'tool') {
    return runSupabaseMutation(
      supabase,
      (sb) => sb.from('v34_tool_topics').upsert({ tool_id: input.targetId, topic_id: input.topicId }),
      { operation: 'v34_tool_topics.upsert', failClosed: false },
    );
  }
  return runSupabaseMutation(
    supabase,
    (sb) => sb.from('v34_contribution_topics').upsert({ contribution_id: input.targetId, topic_id: input.topicId }),
    { operation: 'v34_contribution_topics.upsert', failClosed: false },
  );
}

export async function persistTopicRelationshipToSupabase(
  supabase: SupabaseClient | null | undefined,
  input: {
    sourceTopicId: string;
    targetTopicId: string;
    relationType: 'BROADER_THAN' | 'NARROWER_THAN' | 'RELATED_TO' | 'EQUIVALENT_TO';
  },
): Promise<boolean> {
  if (!supabase && !isStrictPersistenceMode()) return false;
  return runSupabaseMutation(
    supabase,
    (sb) =>
      sb.from('v34_topic_relationships').upsert({
        source_topic_id: input.sourceTopicId,
        target_topic_id: input.targetTopicId,
        relation_type: input.relationType,
      }),
    { operation: 'v34_topic_relationships.upsert', failClosed: true },
  );
}

export async function persistContributionImpactDailyToSupabase(
  supabase: SupabaseClient | null | undefined,
  input: {
    contributionId: string;
    day: string;
    uniqueReaders: number;
    librarySaves: number;
    citationLinks: number;
    replications: number;
  },
): Promise<boolean> {
  if (!supabase && !isStrictPersistenceMode()) return false;
  return runSupabaseMutation(
    supabase,
    (sb) =>
      sb.from('v34_contribution_impact_daily').upsert({
        contribution_id: input.contributionId,
        day: input.day,
        unique_readers: input.uniqueReaders,
        library_saves: input.librarySaves,
        citation_links: input.citationLinks,
        replications: input.replications,
      }),
    { operation: 'v34_contribution_impact_daily.upsert', failClosed: false },
  );
}

export async function persistMobileDashboardModulePrefToSupabase(
  supabase: SupabaseClient | null | undefined,
  input: {
    id: string;
    userId: string;
    moduleKey: string;
    position: number;
    visible: boolean;
    collapsedDefault?: boolean;
  },
): Promise<boolean> {
  if (!supabase && !isStrictPersistenceMode()) return false;
  if (!isUuid(input.userId)) return false;
  return runSupabaseMutation(
    supabase,
    (sb) =>
      sb.from('v34_mobile_dashboard_module_preferences').upsert({
        id: input.id,
        user_id: input.userId,
        module_key: input.moduleKey,
        position: input.position,
        visible: input.visible,
        collapsed_default: input.collapsedDefault ?? false,
      }),
    { operation: 'v34_mobile_dashboard_module_preferences.upsert', failClosed: false },
  );
}

export async function persistMobileExperiencePrefToSupabase(
  supabase: SupabaseClient | null | undefined,
  input: {
    userId: string;
    density?: string;
    defaultSheetSnap?: string;
    offlinePublicCache?: boolean;
    wipeDraftsOnLogout?: boolean;
    quietHoursStart?: string | null;
    quietHoursEnd?: string | null;
  },
): Promise<boolean> {
  if (!supabase && !isStrictPersistenceMode()) return false;
  if (!isUuid(input.userId)) return false;
  return runSupabaseMutation(
    supabase,
    (sb) =>
      sb.from('v34_mobile_experience_preferences').upsert({
        user_id: input.userId,
        density: input.density ?? 'comfortable',
        default_sheet_snap: input.defaultSheetSnap ?? 'half',
        offline_public_cache: input.offlinePublicCache ?? true,
        wipe_drafts_on_logout: input.wipeDraftsOnLogout ?? true,
        quiet_hours_start: input.quietHoursStart ?? null,
        quiet_hours_end: input.quietHoursEnd ?? null,
      }),
    { operation: 'v34_mobile_experience_preferences.upsert', failClosed: false },
  );
}

export async function persistNotificationDeliveryToSupabase(
  supabase: SupabaseClient | null | undefined,
  input: {
    id: string;
    notificationId: string;
    userId: string;
    channel: 'in_app' | 'web_push' | 'email';
    deliveryStatus: 'queued' | 'delivered' | 'failed' | 'suppressed';
    safePreviewApplied: boolean;
    attempts?: number;
    deliveredAt?: string | null;
  },
): Promise<boolean> {
  if (!supabase && !isStrictPersistenceMode()) return false;
  if (!isUuid(input.userId)) return false;
  return runSupabaseMutation(
    supabase,
    (sb) =>
      sb.from('v34_notification_deliveries').upsert({
        id: input.id,
        notification_id: input.notificationId,
        user_id: input.userId,
        channel: input.channel,
        delivery_status: input.deliveryStatus,
        safe_preview_applied: input.safePreviewApplied,
        attempts: input.attempts ?? 1,
        delivered_at: input.deliveredAt ?? null,
      }),
    { operation: 'v34_notification_deliveries.upsert', failClosed: false },
  );
}

export async function listPendingMutationsFromSupabase(
  supabase: SupabaseClient | null | undefined,
  userId: string,
): Promise<Record<string, unknown>[]> {
  if (!supabase || !isUuid(userId)) return [];
  const rows = await runSupabaseQuery<Record<string, unknown>[]>(supabase, (sb) =>
    sb.from('v34_pending_mutations').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
  );
  return rows ?? [];
}

export async function readIdempotencyKeysCountForUser(
  supabase: SupabaseClient | null | undefined,
  userId: string,
): Promise<number> {
  if (!supabase || !isUuid(userId)) return 0;
  const rows = await runSupabaseQuery<Record<string, unknown>[]>(supabase, (sb) =>
    sb.from('v34_idempotency_keys').select('mutation_id').eq('author_id', userId).limit(200),
  );
  return rows?.length ?? 0;
}

export async function persistProfileMetricsToSupabase(
  supabase: SupabaseClient | null | undefined,
  input: {
    userId: string;
    publishedContributions: number;
    verifiedEvidenceCount: number;
    completedReviewsCount: number;
    curatedSourcesCount: number;
    replicationsCount: number;
  },
): Promise<boolean> {
  if (!supabase && !isStrictPersistenceMode()) return false;
  if (!isUuid(input.userId)) return false;
  return runSupabaseMutation(
    supabase,
    (sb) =>
      sb.from('v34_profile_metrics').upsert({
        user_id: input.userId,
        published_contributions: input.publishedContributions,
        verified_evidence_count: input.verifiedEvidenceCount,
        completed_reviews_count: input.completedReviewsCount,
        curated_sources_count: input.curatedSourcesCount,
        replications_count: input.replicationsCount,
        computed_at: new Date().toISOString(),
      }),
    { operation: 'v34_profile_metrics.upsert', failClosed: false },
  );
}

export async function toggleProjectFollowInSupabase(
  supabase: SupabaseClient | null | undefined,
  userId: string,
  projectId: string,
  follow: boolean,
): Promise<boolean> {
  if (!supabase && !isStrictPersistenceMode()) return false;
  if (!isUuid(userId)) return false;
  return runSupabaseMutation(
    supabase,
    (sb) =>
      follow
        ? sb.from('v34_project_follows').upsert({ user_id: userId, project_id: projectId })
        : sb.from('v34_project_follows').delete().eq('user_id', userId).eq('project_id', projectId),
    { operation: 'v34_project_follows.toggle', failClosed: true },
  );
}

export async function toggleToolFollowInSupabase(
  supabase: SupabaseClient | null | undefined,
  userId: string,
  toolId: string,
  follow: boolean,
): Promise<boolean> {
  if (!supabase && !isStrictPersistenceMode()) return false;
  if (!isUuid(userId)) return false;
  return runSupabaseMutation(
    supabase,
    (sb) =>
      follow
        ? sb.from('v34_tool_follows').upsert({ user_id: userId, tool_id: toolId })
        : sb.from('v34_tool_follows').delete().eq('user_id', userId).eq('tool_id', toolId),
    { operation: 'v34_tool_follows.toggle', failClosed: true },
  );
}

export async function toggleUserFollowInSupabase(
  supabase: SupabaseClient | null | undefined,
  followerId: string,
  followeeId: string,
  follow: boolean,
): Promise<boolean> {
  if (!supabase && !isStrictPersistenceMode()) return false;
  if (!isUuid(followerId) || !isUuid(followeeId)) return false;
  return runSupabaseMutation(
    supabase,
    (sb) =>
      follow
        ? sb.from('v34_user_follows').upsert({ follower_id: followerId, followee_id: followeeId })
        : sb.from('v34_user_follows').delete().eq('follower_id', followerId).eq('followee_id', followeeId),
    { operation: 'v34_user_follows.toggle', failClosed: true },
  );
}

export async function persistQuarantinedRelationshipToSupabase(
  supabase: SupabaseClient | null | undefined,
  input: {
    id: string;
    legacyRelationshipId: string;
    sourceKind: string;
    sourceId: string;
    targetKind: string;
    targetId: string;
    legacyRelationType: string;
    quarantineReason: string;
    triagedBy?: string | null;
    resolutionStatus?: 'quarantined' | 'migrated' | 'discarded';
  },
): Promise<boolean> {
  if (!supabase && !isStrictPersistenceMode()) return false;
  return runSupabaseMutation(
    supabase,
    (sb) =>
      sb.from('v34_quarantined_relationships').upsert({
        id: input.id,
        legacy_relationship_id: input.legacyRelationshipId,
        source_kind: input.sourceKind,
        source_id: input.sourceId,
        target_kind: input.targetKind,
        target_id: input.targetId,
        legacy_relation_type: input.legacyRelationType,
        quarantine_reason: input.quarantineReason,
        triaged_by: isUuid(input.triagedBy) ? input.triagedBy : null,
        resolution_status: input.resolutionStatus ?? 'quarantined',
      }),
    { operation: 'v34_quarantined_relationships.upsert', failClosed: true },
  );
}

export async function persistRecognitionSignalToSupabase(
  supabase: SupabaseClient | null | undefined,
  input: {
    id: string;
    contributionId: string;
    actorId: string;
    kind:
      | 'helpful_review'
      | 'referenced'
      | 'saved'
      | 'evidence_used'
      | 'validated_insight'
      | 'replication_documented';
    note?: string | null;
  },
): Promise<boolean> {
  if (!supabase && !isStrictPersistenceMode()) return false;
  if (!isUuid(input.actorId)) return false;
  return runSupabaseMutation(
    supabase,
    (sb) =>
      sb.from('v34_recognition_signals').upsert({
        id: input.id,
        contribution_id: input.contributionId,
        actor_id: input.actorId,
        kind: input.kind,
        note: input.note ?? null,
      }),
    { operation: 'v34_recognition_signals.upsert', failClosed: false },
  );
}

export async function persistResearchActivityDayToSupabase(
  supabase: SupabaseClient | null | undefined,
  input: {
    userId: string;
    activityDate: string;
    evidenceExtracted: number;
    claimsEvaluated: number;
    reviewsCompleted: number;
    draftsSaved: number;
  },
): Promise<boolean> {
  if (!supabase && !isStrictPersistenceMode()) return false;
  if (!isUuid(input.userId)) return false;
  return runSupabaseMutation(
    supabase,
    (sb) =>
      sb.from('v34_research_activity_days').upsert({
        user_id: input.userId,
        activity_date: input.activityDate,
        evidence_extracted: input.evidenceExtracted,
        claims_evaluated: input.claimsEvaluated,
        reviews_completed: input.reviewsCompleted,
        drafts_saved: input.draftsSaved,
      }),
    { operation: 'v34_research_activity_days.upsert', failClosed: false },
  );
}

export async function persistUserActivityEventToSupabase(
  supabase: SupabaseClient | null | undefined,
  input: {
    id: string;
    userId: string;
    eventType: string;
    targetType: string;
    targetId: string;
    workspaceId?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<boolean> {
  if (!supabase && !isStrictPersistenceMode()) return false;
  if (!isUuid(input.userId)) return false;
  return runSupabaseMutation(
    supabase,
    (sb) =>
      sb.from('v34_user_activity_events').insert({
        id: input.id,
        user_id: input.userId,
        event_type: input.eventType,
        target_type: input.targetType,
        target_id: input.targetId,
        workspace_id: input.workspaceId ?? null,
        metadata: input.metadata ?? {},
      }),
    { operation: 'v34_user_activity_events.insert', failClosed: false },
  );
}

export async function persistSearchAlertToSupabase(
  supabase: SupabaseClient | null | undefined,
  input: {
    id: string;
    savedSearchId: string;
    userId: string;
    matchedCount: number;
    status: 'pending' | 'dispatched' | 'suppressed';
    dispatchedAt?: string | null;
  },
): Promise<boolean> {
  if (!supabase && !isStrictPersistenceMode()) return false;
  if (!isUuid(input.userId)) return false;
  return runSupabaseMutation(
    supabase,
    (sb) =>
      sb.from('v34_search_alerts').upsert({
        id: input.id,
        saved_search_id: input.savedSearchId,
        user_id: input.userId,
        matched_count: input.matchedCount,
        status: input.status,
        dispatched_at: input.dispatchedAt ?? null,
      }),
    { operation: 'v34_search_alerts.upsert', failClosed: false },
  );
}

export async function persistWebhookDeliveryToSupabase(
  supabase: SupabaseClient | null | undefined,
  input: {
    id: string;
    provider: string;
    eventType: string;
    deliveryKey: string;
    status: 'received' | 'processed' | 'failed';
    httpStatus: number;
    payloadSha256: string;
    processedAt?: string | null;
  },
): Promise<boolean> {
  if (!supabase && !isStrictPersistenceMode()) return false;
  return runSupabaseMutation(
    supabase,
    (sb) =>
      sb.from('v34_webhook_deliveries').upsert({
        id: input.id,
        provider: input.provider,
        event_type: input.eventType,
        delivery_key: input.deliveryKey,
        status: input.status,
        http_status: input.httpStatus,
        payload_sha256: input.payloadSha256,
        processed_at: input.processedAt ?? null,
      }),
    { operation: 'v34_webhook_deliveries.upsert', failClosed: false },
  );
}

export async function persistOutboxConsumerReceiptToSupabase(
  supabase: SupabaseClient | null | undefined,
  input: {
    consumerName: string;
    eventId: string;
    result?: Record<string, unknown>;
  },
): Promise<boolean> {
  if (!supabase && !isStrictPersistenceMode()) return false;
  if (!isUuid(input.eventId)) return false;
  return runSupabaseMutation(
    supabase,
    (sb) =>
      sb.from('v34_outbox_consumer_receipts').upsert(
        {
          consumer_name: input.consumerName,
          event_id: input.eventId,
          processed_at: new Date().toISOString(),
          result: input.result ?? {},
        },
        { onConflict: 'consumer_name,event_id' },
      ),
    { operation: 'v34_outbox_consumer_receipts.upsert', failClosed: false },
  );
}
