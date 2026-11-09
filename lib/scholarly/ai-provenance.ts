/**
 * AI provenance disclosure logic — πeme v3.1 §26 (pure, unit-tested).
 * Never exposes hidden chain-of-thought; surfaces a concise, source-grounded
 * summary plus validation state and publication blockers.
 */
import type { AIProvenance, AIValidation } from '@/lib/schemas/scholarly';
import { publicationBlockers } from '@/lib/schemas/scholarly';

export interface DisclosureView {
  headline: string;
  rows: Array<{ label: string; value: string }>;
  blockers: string[];
  approvalLabel: string;
}

const TRANSFORMATION_LABEL: Record<string, string> = {
  quoted: 'Quoted from source',
  extracted: 'Extracted from source',
  inferred: 'Inferred (with limitation)',
  generated: 'Generated (synthetic — disclosed)',
};

const VALIDATION_LABEL: Record<string, string> = {
  passed: 'Citations validated',
  failed: 'Citation validation failed',
  unresolved: 'Citations unresolved',
};

export function disclosureView(
  provenance: AIProvenance,
  validation: AIValidation | undefined,
  retractionImpactUnresolved = false,
): DisclosureView {
  const blockers = validation ? publicationBlockers(validation, retractionImpactUnresolved) : [];
  return {
    headline: 'AI-assisted content',
    rows: [
      { label: 'Provider / model', value: `${provenance.provider} ${provenance.model}` },
      { label: 'Operation', value: provenance.operation },
      { label: 'Transformation', value: TRANSFORMATION_LABEL[provenance.transformationType] ?? provenance.transformationType },
      { label: 'Source set', value: `${provenance.sourceSet.length} source(s)` },
      { label: 'Tool calls', value: provenance.toolCalls?.length ? `${provenance.toolCalls.length} recorded` : 'none' },
      { label: 'Generated at', value: provenance.generatedAt },
      ...(validation
        ? [
            { label: 'Citation validation', value: VALIDATION_LABEL[validation.citationEntailment] ?? validation.citationEntailment },
            { label: 'Quotation match', value: validation.quotationMatch },
            { label: 'Human review', value: validation.humanReview },
          ]
        : []),
    ],
    blockers,
    approvalLabel: provenance.humanApproval
      ? `Human-approved by ${provenance.humanApproval.reviewerId.slice(0, 8)}… at ${provenance.humanApproval.approvedAt}`
      : 'Human review pending — publication blocked',
  };
}
