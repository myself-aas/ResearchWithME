/**
 * ResearchWithME v3.4 Part V §14.1 & Part VII §4 Rollout, Targeting & Rollback Feature Flags.
 *
 * Combines:
 * - Part VII §4 migration & schema rollout flags (`v34-*`)
 * - Part V §14.1 product capability flags (`*-v1`)
 * - Deterministic server-side targeting by userId, workspaceId, role, and rollout percentage.
 *   Never rely on client-only flags to protect restricted data.
 */

import { createHash } from 'node:crypto';

export const V34_FEATURE_FLAGS = [
  // Part VII §4 schema & cutover flags
  'v34-normalized-relations',
  'v34-discussions',
  'v34-goals',
  'v34-global-tools',
  'v34-graph-projection',
  'v34-citation-collections',
  'v34-saved-searches',
  'v34-topics-taxonomy',
  // Part V §14.1 product capability catalogue
  'contribution-feed-v1',
  'contribution-wizard-v1',
  'research-dashboard-v1',
  'scholarly-editor-v1',
  'offline-sync-v1',
  'projects-v1',
  'claims-evidence-v1',
  'provenance-graph-v1',
  'assistant-docked-v1',
  'mobile-bottom-nav-v1',
  'realtime-private-v1',
] as const;

export type V34FeatureFlag = (typeof V34_FEATURE_FLAGS)[number];

export interface FlagTargetingContext {
  userId?: string | null;
  workspaceId?: string | null;
  role?: string | null;
}

export interface FlagTargetingRule {
  enabled: boolean;
  percentage?: number; // 0..100 deterministic rollout bucket
  allowedUsers?: string[];
  allowedWorkspaces?: string[];
  allowedRoles?: string[];
}

const ENV_KEY_MAP: Record<V34FeatureFlag, string[]> = {
  'v34-normalized-relations': ['V34_FLAG_NORMALIZED_RELATIONS'],
  'v34-discussions': ['V34_FLAG_DISCUSSIONS'],
  'v34-goals': ['V34_FLAG_GOALS'],
  'v34-global-tools': ['V34_FLAG_GLOBAL_TOOLS'],
  'v34-graph-projection': ['V34_FLAG_GRAPH_PROJECTION'],
  'v34-citation-collections': ['V34_FLAG_CITATION_COLLECTIONS'],
  'v34-saved-searches': ['V34_FLAG_SAVED_SEARCHES'],
  'v34-topics-taxonomy': ['V34_FLAG_TOPICS_TAXONOMY'],
  'contribution-feed-v1': ['V34_FEED_ENABLED', 'V34_FLAG_CONTRIBUTION_FEED'],
  'contribution-wizard-v1': ['V34_FLAG_CONTRIBUTION_WIZARD'],
  'research-dashboard-v1': ['V34_FLAG_RESEARCH_DASHBOARD'],
  'scholarly-editor-v1': ['V34_EDITOR_ENABLED', 'V34_FLAG_SCHOLARLY_EDITOR'],
  'offline-sync-v1': ['V34_FLAG_OFFLINE_SYNC'],
  'projects-v1': ['V34_FLAG_PROJECTS'],
  'claims-evidence-v1': ['V34_FLAG_CLAIMS_EVIDENCE'],
  'provenance-graph-v1': ['V34_FLAG_PROVENANCE_GRAPH'],
  'assistant-docked-v1': ['V34_FLAG_ASSISTANT_DOCKED'],
  'mobile-bottom-nav-v1': ['V34_FLAG_MOBILE_BOTTOM_NAV'],
  'realtime-private-v1': ['V34_REALTIME_ENABLED', 'V34_FLAG_REALTIME'],
};

function parseFlagEnv(value: string | undefined): boolean | null {
  if (!value) return null;
  const norm = value.trim().toLowerCase();
  if (norm === '0' || norm === 'false' || norm === 'off' || norm === 'disabled') return false;
  if (norm === '1' || norm === 'true' || norm === 'on' || norm === 'enabled') return true;
  return null;
}

export function deterministicBucket(flag: string, subjectKey: string): number {
  const digest = createHash('sha256').update(`${flag}:${subjectKey}`).digest();
  const value = digest.readUInt32BE(0);
  return value % 100;
}

export function isV34FlagEnabled(flag: V34FeatureFlag): boolean {
  const envKeys = ENV_KEY_MAP[flag];
  for (const envKey of envKeys) {
    const parsed =
      parseFlagEnv(process.env[envKey]) ?? parseFlagEnv(process.env[`NEXT_PUBLIC_${envKey}`]);
    if (parsed !== null) return parsed;
  }
  return true;
}

/**
 * Evaluates a flag with optional user/workspace/role/percentage targeting rules.
 * Environment kill-switch (`false`) always takes precedence for safe rollback.
 */
export function evaluateV34Flag(
  flag: V34FeatureFlag,
  context?: FlagTargetingContext,
  rule?: FlagTargetingRule,
): boolean {
  if (!isV34FlagEnabled(flag)) return false;
  if (!rule) return true;
  if (!rule.enabled) return false;

  if (rule.allowedUsers?.length && context?.userId && rule.allowedUsers.includes(context.userId)) {
    return true;
  }
  if (
    rule.allowedWorkspaces?.length &&
    context?.workspaceId &&
    rule.allowedWorkspaces.includes(context.workspaceId)
  ) {
    return true;
  }
  if (rule.allowedRoles?.length && context?.role && rule.allowedRoles.includes(context.role)) {
    return true;
  }

  if (typeof rule.percentage === 'number') {
    const clamped = Math.max(0, Math.min(100, rule.percentage));
    if (clamped === 0) return false;
    if (clamped === 100) return true;
    const key = context?.userId || context?.workspaceId || 'anonymous';
    return deterministicBucket(flag, key) < clamped;
  }

  if (rule.allowedUsers?.length || rule.allowedWorkspaces?.length || rule.allowedRoles?.length) {
    return false;
  }
  return true;
}

export function getAllV34FeatureFlags(): Record<V34FeatureFlag, boolean> {
  const out = {} as Record<V34FeatureFlag, boolean>;
  for (const flag of V34_FEATURE_FLAGS) {
    out[flag] = isV34FlagEnabled(flag);
  }
  return out;
}
