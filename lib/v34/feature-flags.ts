/**
 * ResearchWithME v3.4 Part VII §4 Rollout & Rollback Feature Flags.
 *
 * All v3.4 workstream capabilities default to enabled in the v3.4 branch and
 * can be independently disabled via environment variables (e.g.
 * `V34_FLAG_NORMALIZED_RELATIONS=false`) during staged cutover or rollback
 * without redeploying code.
 */

export const V34_FEATURE_FLAGS = [
  'v34-normalized-relations',
  'v34-discussions',
  'v34-goals',
  'v34-global-tools',
  'v34-graph-projection',
  'v34-citation-collections',
  'v34-saved-searches',
  'v34-topics-taxonomy',
] as const;

export type V34FeatureFlag = (typeof V34_FEATURE_FLAGS)[number];

const ENV_KEY_MAP: Record<V34FeatureFlag, string> = {
  'v34-normalized-relations': 'V34_FLAG_NORMALIZED_RELATIONS',
  'v34-discussions': 'V34_FLAG_DISCUSSIONS',
  'v34-goals': 'V34_FLAG_GOALS',
  'v34-global-tools': 'V34_FLAG_GLOBAL_TOOLS',
  'v34-graph-projection': 'V34_FLAG_GRAPH_PROJECTION',
  'v34-citation-collections': 'V34_FLAG_CITATION_COLLECTIONS',
  'v34-saved-searches': 'V34_FLAG_SAVED_SEARCHES',
  'v34-topics-taxonomy': 'V34_FLAG_TOPICS_TAXONOMY',
};

function parseFlagEnv(value: string | undefined): boolean | null {
  if (!value) return null;
  const norm = value.trim().toLowerCase();
  if (norm === '0' || norm === 'false' || norm === 'off' || norm === 'disabled') return false;
  if (norm === '1' || norm === 'true' || norm === 'on' || norm === 'enabled') return true;
  return null;
}

export function isV34FlagEnabled(flag: V34FeatureFlag): boolean {
  const envKey = ENV_KEY_MAP[flag];
  const parsed =
    parseFlagEnv(process.env[envKey]) ?? parseFlagEnv(process.env[`NEXT_PUBLIC_${envKey}`]);
  return parsed ?? true;
}

export function getAllV34FeatureFlags(): Record<V34FeatureFlag, boolean> {
  const out = {} as Record<V34FeatureFlag, boolean>;
  for (const flag of V34_FEATURE_FLAGS) {
    out[flag] = isV34FlagEnabled(flag);
  }
  return out;
}
