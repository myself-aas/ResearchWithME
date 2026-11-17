import { NextResponse } from 'next/server';
import { getAllV34FeatureFlags } from '@/lib/v34/feature-flags';
import { requireContributor } from '@/lib/v34/http';
import {
  listClaims,
  listContributions,
  listEvidence,
  listLibraryItems,
  listSources,
  listUserDrafts,
} from '@/lib/v34/store';
import { listFormalReviews, listProjects } from '@/lib/v34/wave2-store';
import {
  getDashboardPreferences,
  getRecognitionSummary,
  listAssistantTasks,
  listAttentionItems,
  listNotifications,
} from '@/lib/v34/wave3-store';
import {
  listCitationCollections,
  listHydratedResearchGoals,
  listSavedSearches,
} from '@/lib/v34/wave5-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Part V §6.3 & Part VI §14 — Personal Research OS aggregated home endpoint.
 * Strictly preserves boundary between Library, Sources, Goals, Projects,
 * Attention, Notifications, and optional Assistant Suggestions.
 */
export async function GET() {
  const started = performance.now();
  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const userId = auth.actor.id;
  const [sources, projects] = await Promise.all([listSources(), listProjects()]);
  const contributions = listContributions();
  const drafts = listUserDrafts(userId);
  const attention = listAttentionItems(userId);
  const notifications = listNotifications(userId);
  const assistantTasks = listAssistantTasks(userId);
  const goals = listHydratedResearchGoals(userId);
  const libraryItems = listLibraryItems(userId);
  const citationCollections = listCitationCollections(userId);
  const savedSearches = listSavedSearches(userId);
  const reviews = listFormalReviews();
  const recognition = getRecognitionSummary(auth.actor.handle);
  const preferences = getDashboardPreferences(userId);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    latencyMs: Math.max(1, Math.round(performance.now() - started)),
    continueWorking: {
      drafts: drafts.slice(0, 5),
      inProgressContributions: contributions
        .filter((c) => c.lifecycle === 'draft' || c.lifecycle === 'under-review')
        .slice(0, 5),
    },
    attentionQueue: {
      openCount: attention.filter((a) => a.status === 'OPEN').length,
      items: attention.slice(0, 10),
    },
    notifications: {
      unreadCount: notifications.filter((n) => !n.readAt).length,
      items: notifications.slice(0, 10),
    },
    researchGoals: {
      activeCount: goals.filter((g) => g.status === 'ACTIVE').length,
      items: goals.slice(0, 10),
    },
    activeProjects: {
      total: projects.length,
      items: projects.slice(0, 6),
    },
    reviewQueue: {
      openCount: reviews.filter((r) => r.status !== 'RESOLVED').length,
      items: reviews.slice(0, 6),
    },
    librarySummary: {
      savedItemsCount: libraryItems.length,
      citationCollectionsCount: citationCollections.length,
      savedSearchesCount: savedSearches.length,
    },
    knowledgeSummary: {
      sourcesCount: sources.length,
      evidenceCount: listEvidence().length,
      claimsCount: listClaims().length,
      publishedContributionsCount: contributions.filter((c) => c.lifecycle === 'published').length,
    },
    assistantSuggestions: {
      pendingCount: assistantTasks.filter((t) => t.status === 'SUGGESTED').length,
      items: assistantTasks.slice(0, 6),
    },
    recognition,
    preferences,
    featureFlags: getAllV34FeatureFlags(),
  });
}
