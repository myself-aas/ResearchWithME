/**
 * SourceCard presentation logic — reme v3.1 §27.3 (pure, unit-tested).
 */
import type { Source, SourceVersion, PermissionDecision, ExternalIdentifier } from '@/lib/schemas/scholarly';
import { component } from '@/tokens/generated/tokens';

export type SourceCardState = 'retracted' | 'corrected' | 'embargoed' | 'restricted' | 'ready';

export function resolveSourceState(
  source: Pick<Source, 'classification'>,
  sourceVersion: Pick<SourceVersion, 'integrity'>,
  permissions: PermissionDecision[],
): { state: SourceCardState; notice?: string } {
  const r = sourceVersion.integrity.retractionStatus;
  if (r === 'retracted') return { state: 'retracted', notice: 'This source has been retracted. Preserved for review; MUST NOT support publication.' };
  if (r === 'corrected' || r === 'under-investigation') return { state: 'corrected', notice: 'This source has been corrected or is under investigation. Compare versions before relying on it.' };
  if (source.classification === 'embargoed') return { state: 'embargoed', notice: 'Under embargo — visible to authorized reviewers only.' };
  if (source.classification === 'restricted' || source.classification === 'confidential') {
    const canRead = permissions.some((p) => p.capability === 'read:source' && p.granted);
    if (!canRead) return { state: 'restricted', notice: 'Restricted source — contact the workspace owner for access.' };
  }
  return { state: 'ready' };
}

/** Primary identifier for display: DOI first, else the first identifier. */
export function primaryIdentifier(source: Pick<Source, 'identifiers'>): ExternalIdentifier | undefined {
  return source.identifiers.find((i) => i.scheme === 'doi') ?? source.identifiers[0];
}

export function sourceCardLabel(source: Source): string {
  return `Source: “${source.title}” (${source.sourceType})`;
}

export const sourceCardTokens = {
  background: `bg-[var(--reme-component-source-card-background)]`,
  border: `border-[var(--reme-component-source-card-border)]`,
  accentDot: `bg-[var(--reme-component-source-card-accent)]`,
  title: `text-[var(--reme-component-source-card-title)]`,
  metadata: `text-[var(--reme-component-source-card-metadata)]`,
} as const;

export const sourceCardComponentTokens = component.sourceCard;
