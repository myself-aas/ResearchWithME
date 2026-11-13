/**
 * EvidenceCard — reme v3.1 first reference component (spec §7, §27.2).
 *
 * Purpose: shows one piece of evidence with its exact source location, source,
 * extractor/AI label, and trust state — traceable in one interaction.
 * Anatomy: notice (retraction/embargo first) → type/status line → statement →
 *   locator → assessment summary → limitation → AI disclosure → actions → details.
 * Variants: default | compact | comparison | read-only | archived.
 * Density: compact | comfortable | spacious (spacing only, never information).
 * States: loading (Skeleton) · ready · unresolved · restricted · embargoed ·
 *   corrected · retracted · error — resolved by lib/scholarly/evidence-card.ts.
 * Props/events: EvidenceCardProps per §27.2 (onInspect, onAddSupport, …).
 * Keyboard: native buttons/links; card itself is not focusable.
 * Screen reader: <article aria-label> derived from evidence + source, not status alone.
 * Permissions: restricted/embargoed render notice-only bodies when read is denied.
 * Token mapping: components/ui tokens + component.evidenceCard.* via evidenceCardTokens.
 * Tests: lib/__tests__/evidence-card.test.ts. Migration: CMS discussion/claim
 *   cards adopt this card in stage 3.
 */
import type {
  Evidence,
  Source,
  SourceVersion,
  PermissionDecision,
  ObjectId,
} from '@/lib/schemas/scholarly';
import {
  resolveEvidenceState,
  assessmentText,
  evidenceCardLabel,
  evidenceCardTokens,
} from '@/lib/scholarly/evidence-card';
import Skeleton from '@/components/ui/Skeleton';
import Alert from '@/components/ui/Alert';

export interface EvidenceCardProps {
  evidence: Evidence;
  source: Source;
  sourceVersion: SourceVersion;
  variant?: 'default' | 'compact' | 'comparison' | 'read-only' | 'archived';
  density?: 'compact' | 'comfortable' | 'spacious';
  permissions: PermissionDecision[];
  supportingCount?: number;
  contradictingCount?: number;
  loading?: boolean;
  error?: string;
  selected?: boolean;
  onInspect?: (id: ObjectId) => void;
  onAddSupport?: (id: ObjectId) => void;
  onAddContradiction?: (id: ObjectId) => void;
  onRequestReview?: (id: ObjectId) => void;
  onCopyWithCitation?: (id: ObjectId) => void;
}

const DENSITY: Record<NonNullable<EvidenceCardProps['density']>, string> = {
  compact: 'p-3',
  comfortable: 'p-4',
  spacious: 'p-6',
};

export default function EvidenceCard({
  evidence,
  source,
  sourceVersion,
  variant = 'default',
  density = 'comfortable',
  permissions,
  supportingCount = 0,
  contradictingCount = 0,
  loading = false,
  error,
  selected = false,
  onInspect,
  onAddSupport,
  onAddContradiction,
  onRequestReview,
  onCopyWithCitation,
}: EvidenceCardProps) {
  if (loading) {
    return (
      <div className={`rounded-md border ${evidenceCardTokens.border} ${evidenceCardTokens.background} ${DENSITY[density]}`} aria-label="Loading evidence">
        <Skeleton lines={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-md border ${evidenceCardTokens.border} ${evidenceCardTokens.background} ${DENSITY[density]}`}>
        <Alert tone="error" title="Evidence could not be loaded">
          {error}
        </Alert>
      </div>
    );
  }

  const { state, notice } = resolveEvidenceState(evidence, source, sourceVersion, permissions);
  const bodyDenied = state === 'restricted' || state === 'embargoed';
  const archived = variant === 'archived';

  const actionBtn =
    'inline-flex min-h-11 items-center rounded-sm bg-surface px-3 py-2 font-sans text-sm font-medium text-brand transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

  return (
    <article
      aria-label={evidenceCardLabel(evidence, source)}
      data-selected={selected || undefined}
      className={`rounded-md border ${evidenceCardTokens.border} ${evidenceCardTokens.background} ${DENSITY[density]} ${archived ? 'opacity-75' : ''} ${selected ? 'ring-2 ring-focus' : ''}`}
    >
      {notice ? (
        <div className="mb-3">
          <Alert tone={notice.tone === 'error' ? 'error' : 'warning'} title={notice.tone === 'error' ? 'Retraction notice' : notice.tone === 'warning' ? 'Access notice' : 'Resolution notice'}>
            {notice.text}
          </Alert>
        </div>
      ) : null}

      <p className={`flex items-center gap-2 font-sans text-[0.8125rem] font-semibold uppercase tracking-[0.04em] ${evidenceCardTokens.metadata}`}>
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${evidenceCardTokens.accentDot}`} />
        Evidence · {evidence.extractionType}
        {evidence.aiProvenance ? ' · AI-assisted' : ''}
      </p>

      {bodyDenied ? (
        <p className={`mt-2 font-sans text-sm ${evidenceCardTokens.metadata}`}>
          Content hidden — {state === 'embargoed' ? 'under embargo' : 'restricted'}.
        </p>
      ) : (
        <>
          <p className={`mt-2 text-[1.125rem] leading-[1.7] ${evidenceCardTokens.title}`}>{evidence.statement}</p>
          <p className={`mt-2 font-sans text-sm ${evidenceCardTokens.metadata}`}>
            Source: <span className="font-medium">{source.title}</span> · {evidence.locator.kind} {evidence.locator.value}
            {sourceVersion.versionLabel ? ` · v${sourceVersion.versionLabel}` : ''}
          </p>
          <p className={`mt-1 font-sans text-sm ${evidenceCardTokens.metadata}`}>
            {assessmentText(evidence.assessment, supportingCount, contradictingCount)}
          </p>
          {evidence.limitation ? (
            <p className={`mt-1 font-sans text-sm ${evidenceCardTokens.metadata}`}>Limitation: {evidence.limitation}</p>
          ) : null}
          {evidence.aiProvenance ? (
            <p className={`mt-1 font-sans text-xs ${evidenceCardTokens.metadata}`}>
              AI-assisted: {evidence.aiProvenance.provider} {evidence.aiProvenance.model} · {evidence.aiProvenance.transformationType} ·
              citations {evidence.aiProvenance.citationValidation}
              {evidence.aiProvenance.humanApproval ? ' · human-approved' : ' · human review pending'}
            </p>
          ) : null}
        </>
      )}

      {variant !== 'read-only' && !bodyDenied ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {onInspect ? <button type="button" className={actionBtn} onClick={() => onInspect(evidence.id)}>Inspect</button> : null}
          {onAddSupport ? <button type="button" className={actionBtn} onClick={() => onAddSupport(evidence.id)}>Add support</button> : null}
          {onAddContradiction ? <button type="button" className={actionBtn} onClick={() => onAddContradiction(evidence.id)}>Contradict</button> : null}
          {onRequestReview ? <button type="button" className={actionBtn} onClick={() => onRequestReview(evidence.id)}>Request review</button> : null}
          {onCopyWithCitation ? <button type="button" className={actionBtn} onClick={() => onCopyWithCitation(evidence.id)}>Copy with citation</button> : null}
        </div>
      ) : null}
    </article>
  );
}
