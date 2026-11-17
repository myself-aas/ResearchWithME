/**
 * ResearchWithME v3.4 Part I §17 & Part V §14.2 — Experimentation Registry.
 *
 * Privacy-safe, deterministic experiment assignment with explicit primary
 * metrics, scholarly guardrails, minimum runtime, and accountable owners.
 * Never logs research text, quotations, or anonymous reviewer identities.
 */

import { deterministicBucket } from './feature-flags';

export interface ExperimentDefinition {
  id: string;
  hypothesis: string;
  variants: readonly string[];
  primaryMetric: string;
  guardrails: readonly string[];
  eligibility: string;
  minimumRuntimeDays: number;
  owner: string;
  decisionDate?: string;
}

export const V34_EXPERIMENTS: readonly ExperimentDefinition[] = [
  {
    id: 'exp-feed-contribution-cta-v1',
    hypothesis:
      'Showing a source-grounded "Contribute a review" prompt next to high-activity papers increases first-contribution starts without reducing reading depth.',
    variants: ['control', 'contextual-source-cta'],
    primaryMetric: 'visitor_to_first_draft_started_7d',
    guardrails: [
      'article_completion_rate_non_regression',
      'citation_verification_pass_rate_gte_95pct',
      'zero_anonymous_reviewer_leak',
    ],
    eligibility: 'public-and-signed-in-readers',
    minimumRuntimeDays: 14,
    owner: 'Product Lead',
  },
  {
    id: 'exp-wizard-skip-interview-v1',
    hypothesis:
      'Offering a single-click "Jump straight to Workspace editor" path reduces abandonment for experienced researchers while preserving evidence attachment rates.',
    variants: ['control', 'quick-workspace-handoff'],
    primaryMetric: 'contribution_publish_completion_rate',
    guardrails: [
      'evidence_attached_per_contribution_non_regression',
      'limitation_disclosure_rate_non_regression',
    ],
    eligibility: 'authenticated-contributors',
    minimumRuntimeDays: 21,
    owner: 'Frontend Lead',
  },
  {
    id: 'exp-dashboard-continue-first-v1',
    hypothesis:
      'Ordering Continue Working directly beneath Critical Attention on mobile Research OS increases 7-day returning draft completion.',
    variants: ['control', 'attention-then-continue'],
    primaryMetric: 'returning_draft_resume_7d',
    guardrails: [
      'attention_acknowledge_latency_non_regression',
      'mobile_lcp_lte_2500ms',
    ],
    eligibility: 'authenticated-mobile-sessions',
    minimumRuntimeDays: 14,
    owner: 'Dashboard Owner',
  },
] as const;

export function getExperimentById(id: string): ExperimentDefinition | null {
  return V34_EXPERIMENTS.find((e) => e.id === id) ?? null;
}

export function assignExperimentVariant(
  experimentId: string,
  subjectId: string,
): { experimentId: string; variant: string; bucket: number } | null {
  const exp = getExperimentById(experimentId);
  if (!exp || exp.variants.length === 0) return null;
  const bucket = deterministicBucket(`exp:${exp.id}`, subjectId);
  const idx = Math.floor((bucket / 100) * exp.variants.length) % exp.variants.length;
  return {
    experimentId: exp.id,
    variant: exp.variants[idx] ?? exp.variants[0],
    bucket,
  };
}
