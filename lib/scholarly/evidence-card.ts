/**
 * EvidenceCard presentation logic — reme v3.1 §27.2 (pure, unit-tested).
 * Maps a validated Evidence + SourceVersion + permissions to the card's
 * state, precedence-ordered notices, calibrated assessment text, and
 * token-mapped class names. No rendering here.
 */
import type {
  Evidence,
  Source,
  SourceVersion,
  PermissionDecision,
  Assessment,
} from '@/lib/schemas/scholarly';
import { component } from '@/tokens/generated/tokens';

export type EvidenceCardState =
  | 'retracted'
  | 'corrected'
  | 'embargoed'
  | 'restricted'
  | 'unresolved'
  | 'ready';

export interface ResolvedEvidenceState {
  state: EvidenceCardState;
  /** Notice that MUST precede ordinary metadata (retraction/embargo first). */
  notice?: { tone: 'error' | 'warning' | 'info'; text: string };
}

const NOTICE_TEXT: Record<string, string> = {
  retracted: 'This source has been retracted. The evidence is preserved for review and MUST NOT support publication.',
  corrected: 'This source has been corrected. Compare versions before relying on this evidence.',
  embargoed: 'This evidence is under embargo until the embargo lifts. Access is restricted to authorized reviewers.',
  restricted: 'This evidence is restricted. Contact the workspace owner for access.',
  unresolved: 'The source identifier could not be resolved. Treat this evidence as unassessed.',
};

export function resolveEvidenceState(
  evidence: Pick<Evidence, 'classification'>,
  source: Pick<Source, 'identifiers'>,
  sourceVersion: Pick<SourceVersion, 'integrity'>,
  permissions: PermissionDecision[],
): ResolvedEvidenceState {
  const retraction = sourceVersion.integrity.retractionStatus;
  if (retraction === 'retracted') return { state: 'retracted', notice: { tone: 'error', text: NOTICE_TEXT.retracted } };
  if (retraction === 'corrected' || retraction === 'under-investigation')
    return { state: 'corrected', notice: { tone: 'warning', text: NOTICE_TEXT.corrected } };
  if (evidence.classification === 'embargoed')
    return { state: 'embargoed', notice: { tone: 'warning', text: NOTICE_TEXT.embargoed } };
  if (evidence.classification === 'restricted' || evidence.classification === 'confidential') {
    const canRead = permissions.some((p) => p.capability === 'read:evidence' && p.granted);
    if (!canRead) return { state: 'restricted', notice: { tone: 'warning', text: NOTICE_TEXT.restricted } };
  }
  const unresolved = source.identifiers.some((id) => id.resolutionStatus === 'unresolved' || id.resolutionStatus === 'invalid');
  if (unresolved) return { state: 'unresolved', notice: { tone: 'info', text: NOTICE_TEXT.unresolved } };
  return { state: 'ready' };
}

/** Calibrated assessment text (spec §8) — never "trusted"/"verified" without method. */
export function assessmentText(
  assessment: Assessment,
  supportingCount: number,
  contradictingCount: number,
): string {
  const base =
    assessment === 'supports'
      ? `Supported by ${supportingCount} source${supportingCount === 1 ? '' : 's'}`
      : assessment === 'contradicts'
        ? 'Contradicted by linked evidence'
        : assessment === 'neutral'
          ? 'Neutral in this context'
          : 'Not assessed';
  if (contradictingCount > 0) return `${base}; evidence is mixed (${contradictingCount} contradicting)`;
  return base;
}

/** Accessible label for the card's <article> — derived from evidence + source, not status alone (§27.2). */
export function evidenceCardLabel(evidence: Evidence, source: Source): string {
  const loc = `${evidence.locator.kind} ${evidence.locator.value}`;
  return `Evidence: ${evidence.statement.slice(0, 80)} — from “${source.title}”, ${loc}`;
}

/** Token mapping for the card (component tokens from the generated pipeline). */
export const evidenceCardTokens = {
  background: `bg-[var(--reme-component-evidence-card-background)]`,
  border: `border-[var(--reme-component-evidence-card-border)]`,
  accentDot: `bg-[var(--reme-component-evidence-card-accent)]`,
  title: `text-[var(--reme-component-evidence-card-title)]`,
  metadata: `text-[var(--reme-component-evidence-card-metadata)]`,
} as const;

export const evidenceCardComponentTokens = component.evidenceCard;
