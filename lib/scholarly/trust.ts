/**
 * Trust presentation logic — reme v3.1 §23 (pure, unit-tested).
 * Dimensions are rendered independently; "not assessed" is visually and
 * semantically distinct from a negative result; no aggregate score is computed.
 */
import { isNegativeAssessment, type EvidenceAssessment } from '@/lib/schemas/scholarly';

export interface TrustDimensionView {
  dimension: string;
  label: string;
  /** 'positive' | 'negative' | 'not-assessed' — not-assessed is NOT negative */
  polarity: 'positive' | 'negative' | 'not-assessed';
  toneClass: string;
}

const LABELS: Record<string, string> = {
  review: 'Peer reviewed',
  replication: 'Replication',
  certainty: 'Certainty',
  consensus: 'Consensus',
  sourceIntegrity: 'Source integrity',
};

const VALUE_LABELS: Record<string, string> = {
  'not-reviewed': 'Not reviewed',
  'editorially-reviewed': 'Editorially reviewed',
  'peer-reviewed': 'Peer reviewed',
  'not-assessed': 'Not assessed',
  replicated: 'Replicated',
  'partially-replicated': 'Partially replicated',
  'failed-to-replicate': 'Failed to replicate',
  'very-low': 'Very low certainty',
  low: 'Low certainty',
  moderate: 'Moderate certainty',
  high: 'High certainty',
  unknown: 'Consensus unknown',
  emerging: 'Emerging consensus',
  mixed: 'Mixed consensus',
  broad: 'Broad consensus',
  contested: 'Contested',
  active: 'Active',
  corrected: 'Corrected',
  'expression-of-concern': 'Expression of concern',
  retracted: 'Retracted',
  withdrawn: 'Withdrawn',
};

const NOT_ASSESSED = new Set(['not-assessed', 'not-reviewed', 'unknown']);

function polarityOf(dimension: string, value: string): TrustDimensionView['polarity'] {
  if (NOT_ASSESSED.has(value)) return 'not-assessed';
  return isNegativeAssessment(value) ? 'negative' : 'positive';
}

const TONE: Record<TrustDimensionView['polarity'], string> = {
  positive: 'text-trust-verified',
  negative: 'text-destructive',
  'not-assessed': 'text-text-tertiary italic',
};

export function trustDimensions(a: EvidenceAssessment): TrustDimensionView[] {
  return [
    { dimension: 'review', label: `${LABELS.review}: ${VALUE_LABELS[a.review]}`, polarity: polarityOf('review', a.review), toneClass: TONE[polarityOf('review', a.review)] },
    { dimension: 'replication', label: `${LABELS.replication}: ${VALUE_LABELS[a.replication]}`, polarity: polarityOf('replication', a.replication), toneClass: TONE[polarityOf('replication', a.replication)] },
    { dimension: 'certainty', label: VALUE_LABELS[a.certainty], polarity: a.certainty === 'very-low' ? 'negative' : 'positive', toneClass: TONE[a.certainty === 'very-low' ? 'negative' : 'positive'] },
    { dimension: 'consensus', label: VALUE_LABELS[a.consensus], polarity: polarityOf('consensus', a.consensus), toneClass: TONE[polarityOf('consensus', a.consensus)] },
    { dimension: 'sourceIntegrity', label: `${LABELS.sourceIntegrity}: ${VALUE_LABELS[a.sourceIntegrity]}`, polarity: polarityOf('sourceIntegrity', a.sourceIntegrity), toneClass: TONE[polarityOf('sourceIntegrity', a.sourceIntegrity)] },
  ];
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Compact presentation per §23: "Peer reviewed · Replication not assessed · Moderate certainty · Mixed consensus · Source active" */
export function compactTrustLine(a: EvidenceAssessment): string {
  return [
    VALUE_LABELS[a.review],
    `${LABELS.replication} ${lowerFirst(VALUE_LABELS[a.replication])}`,
    VALUE_LABELS[a.certainty],
    VALUE_LABELS[a.consensus],
    `Source ${lowerFirst(VALUE_LABELS[a.sourceIntegrity])}`,
  ].join(' · ');
}
