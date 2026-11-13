/**
 * ClaimCard — reme v3.1 §27.4 (stage 3, beta).
 *
 * MUST show: claim type, lifecycle, author/version, supporting/contradicting
 * evidence counts, assessment dimensions, unresolved integrity impacts,
 * responsible reviewer. Actions are capability-checked (never client-trusted).
 * Anatomy: type/lifecycle line → claim text → counts → trust summary →
 * integrity impact → actions.
 * Token mapping: component.claimCard.* aliases. Tests: claim-card.test.ts.
 */
import type { Claim, ClaimAssessment, PermissionDecision, IntegrityEvent, ObjectId } from '@/lib/schemas/scholarly';
import { can, claimCardLabel, evidenceCounts, claimCardTokens } from '@/lib/scholarly/claim-card';
import TrustAssessmentSummary from '@/components/scholarly/TrustAssessmentSummary';
import Alert from '@/components/ui/Alert';

export interface ClaimCardProps {
  claim: Claim;
  assessment?: ClaimAssessment;
  unresolvedIntegrity?: IntegrityEvent[];
  responsibleReviewer?: string;
  permissions: PermissionDecision[];
  onInspect?: (id: ObjectId) => void;
  onSupport?: (id: ObjectId) => void;
  onContradict?: (id: ObjectId) => void;
  onRequestReview?: (id: ObjectId) => void;
  onCompareVersions?: (id: ObjectId) => void;
  onCite?: (id: ObjectId) => void;
}

export default function ClaimCard({
  claim,
  assessment,
  unresolvedIntegrity = [],
  responsibleReviewer,
  permissions,
  onInspect,
  onSupport,
  onContradict,
  onRequestReview,
  onCompareVersions,
  onCite,
}: ClaimCardProps) {
  const actionBtn =
    'inline-flex min-h-11 items-center rounded-sm bg-surface px-3 py-2 font-sans text-sm font-medium text-brand transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
  const blocked = unresolvedIntegrity.some((e) => e.disposition === 'publication-blocked' || e.disposition === undefined);

  return (
    <article aria-label={claimCardLabel(claim)} className={`rounded-md border ${claimCardTokens.border} ${claimCardTokens.background} p-4`}>
      <p className={`font-sans text-[0.8125rem] font-semibold uppercase tracking-[0.04em] text-text-tertiary`}>
        Claim · {claim.claimType} · {claim.lifecycle} · v{claim.objectVersion}
      </p>
      <p className="mt-2 text-[1.125rem] leading-[1.7] text-text-primary">{claim.text}</p>

      <p className={`mt-2 font-sans text-sm ${claimCardTokens.support}`}>
        {evidenceCounts(assessment?.evidenceCount ?? claim.supportingEvidenceIds.length, assessment?.contradictionCount ?? claim.contradictingEvidenceIds.length)}
        {assessment && assessment.contradictionCount > 0 ? <span className={`ml-1 ${claimCardTokens.contradiction}`}>(evidence is mixed)</span> : null}
      </p>

      {unresolvedIntegrity.length > 0 ? (
        <div className="mt-3">
          <Alert tone="warning" title="Unresolved integrity impact">
            {unresolvedIntegrity.length} integrity event(s) affect this claim{blocked ? ' — publication is blocked until resolved' : ''}.
          </Alert>
        </div>
      ) : null}

      {assessment ? (
        <div className="mt-3">
          <TrustAssessmentSummary assessment={assessment} compact />
        </div>
      ) : (
        <p className={`mt-3 font-sans text-sm italic text-text-tertiary ${claimCardTokens.unresolved}`}>Trust not assessed — absence of assessment, not a negative result.</p>
      )}

      {responsibleReviewer ? (
        <p className="mt-2 font-sans text-xs text-text-tertiary">Responsible reviewer: {responsibleReviewer}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {onInspect && can(permissions, 'inspect:claim') ? <button type="button" className={actionBtn} onClick={() => onInspect(claim.id)}>Inspect</button> : null}
        {onSupport && can(permissions, 'support:claim') ? <button type="button" className={actionBtn} onClick={() => onSupport(claim.id)}>Support</button> : null}
        {onContradict && can(permissions, 'contradict:claim') ? <button type="button" className={actionBtn} onClick={() => onContradict(claim.id)}>Contradict</button> : null}
        {onRequestReview && can(permissions, 'review:request') ? <button type="button" className={actionBtn} onClick={() => onRequestReview(claim.id)}>Request review</button> : null}
        {onCompareVersions && can(permissions, 'versions:compare') ? <button type="button" className={actionBtn} onClick={() => onCompareVersions(claim.id)}>Compare versions</button> : null}
        {onCite && can(permissions, 'cite:claim') ? <button type="button" className={actionBtn} onClick={() => onCite(claim.id)}>Cite</button> : null}
      </div>
    </article>
  );
}
