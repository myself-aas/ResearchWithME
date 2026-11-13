/**
 * TrustAssessmentSummary — reme v3.1 §23 component.
 *
 * Purpose: show the five trust dimensions independently — review, replication,
 * certainty, consensus, source integrity. NEVER one aggregate score/badge.
 * "Not assessed" renders muted + italic, semantically distinct from negative
 * results (which render in the destructive token). Aggregate scores are only
 * allowed with inspectable method/weights/assessor — not implemented here.
 *
 * Anatomy: heading (visually hidden unless `showHeading`) + list of dimensions.
 * Props: assessment: EvidenceAssessment, compact?: boolean, showHeading?: boolean.
 * Screen reader: plain list; polarity conveyed by text labels, not color alone.
 * Token mapping: trust-* semantic tokens; text-tertiary for not-assessed.
 * Tests: lib/__tests__/trust-assessment.test.ts.
 */
import type { EvidenceAssessment } from '@/lib/schemas/scholarly';
import { trustDimensions, compactTrustLine } from '@/lib/scholarly/trust';

export interface TrustAssessmentSummaryProps {
  assessment: EvidenceAssessment;
  compact?: boolean;
  showHeading?: boolean;
}

export default function TrustAssessmentSummary({ assessment, compact = false, showHeading = false }: TrustAssessmentSummaryProps) {
  if (compact) {
    return (
      <p className="font-sans text-sm text-text-secondary" aria-label={`Trust assessment: ${compactTrustLine(assessment)}`}>
        {compactTrustLine(assessment)}
      </p>
    );
  }
  const dims = trustDimensions(assessment);
  return (
    <section aria-label="Trust assessment" className="rounded-md border border-line bg-surface p-4">
      {showHeading ? (
        <h3 className="font-sans text-[1.125rem] font-[650] leading-[1.35] text-text-primary">Trust assessment</h3>
      ) : null}
      <ul className="mt-2 space-y-1">
        {dims.map((d) => (
          <li key={d.dimension} className={`font-sans text-sm ${d.toneClass}`}>
            {d.label}
            {d.polarity === 'not-assessed' ? <span className="sr-only"> (not assessed — no negative finding)</span> : null}
          </li>
        ))}
      </ul>
      <p className="mt-2 font-sans text-xs text-text-tertiary">
        Assessed by {assessment.assessedBy.slice(0, 8)}… via {assessment.method} on {assessment.assessedAt.slice(0, 10)}.
      </p>
    </section>
  );
}
