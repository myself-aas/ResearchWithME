import type {
  DialogueItem,
  EvidenceAssessment,
  IntegrityEvent,
  IntegrityEventType,
  KnowledgeRelationship,
  RelationshipLabel,
  ScholarlyObjectBase,
} from '@/lib/schemas/scholarly';
import type { TrustDimensions } from './contracts';
import type {
  ClaimEvidenceLink,
  ClaimRecord,
  ContributionRecord,
  EvidenceRecord,
  IntegrityEventRecord,
  SourceRecord,
} from './store';
import type { FormalReviewRecord } from './wave2-store';

const DEFAULT_ASSESSOR_UUID = '00000000-0000-4000-8000-000000000001';

export function toScholarlyAssessment(
  trust: TrustDimensions,
  options?: { assessedBy?: string | null; assessedAt?: string },
): EvidenceAssessment {
  return {
    review: trust.review,
    replication: trust.replication,
    certainty: trust.certainty,
    consensus: trust.consensus,
    sourceIntegrity: trust.sourceIntegrity,
    assessedBy: options?.assessedBy || DEFAULT_ASSESSOR_UUID,
    assessedAt: options?.assessedAt || '2026-11-16T12:00:00.000Z',
    method: trust.method || 'Structured source & locator verification',
  };
}

export function toScholarlyIntegrityEvent(
  event: IntegrityEventRecord,
  affectedObjectIds: string[] = [],
): IntegrityEvent {
  const mapType: Record<IntegrityEventRecord['status'], IntegrityEventType> = {
    retracted: 'retraction',
    withdrawn: 'retraction',
    corrected: 'correction',
    'expression-of-concern': 'expression-of-concern',
    active: 'correction',
  };

  return {
    id: event.id,
    at: event.recordedAt,
    eventType: mapType[event.status],
    sourceId: event.sourceId,
    sourceVersionId: event.sourceVersionId ?? `${event.sourceId}-v1`,
    affectedObjectIds,
    disposition:
      event.disposition === 'publication-blocked'
        ? 'publication-blocked'
        : event.disposition === 'resolved'
          ? 'resolved'
          : 'preserved-and-marked',
    recordedBy: event.recordedBy || DEFAULT_ASSESSOR_UUID,
  };
}

/**
 * Adapts canonical v3.4 Formal Reviews, Rebuttals & Decisions into the
 * chronological DialogueItem list rendered by `components/scholarly/ReviewThread`.
 */
export function toScholarlyDialogueItems(reviews: FormalReviewRecord[]): DialogueItem[] {
  const out: DialogueItem[] = [];

  for (const review of reviews) {
    for (const item of review.items) {
      out.push({
        id: item.id,
        type: item.itemType,
        authorId: item.anonymous ? 'anonymous-reviewer' : item.authorName,
        createdAt: item.createdAt,
        body: item.body,
        scope: item.scope ?? review.scope,
        status: item.status,
        anonymous: item.anonymous || review.anonymous,
      });
    }

    for (const rebuttal of review.rebuttals) {
      out.push({
        id: rebuttal.id,
        type: 'rebuttal',
        authorId: rebuttal.authorName,
        createdAt: rebuttal.createdAt,
        body: rebuttal.body,
        reviewItemIds: rebuttal.reviewItemIds,
        anonymous: false,
      });
    }

    for (const decision of review.decisions) {
      out.push({
        id: decision.id,
        type: 'decision',
        authorId: decision.decidedByName,
        createdAt: decision.createdAt,
        body: `Editorial decision: ${decision.outcome.replace(/_/g, ' ')}`,
        rationale: decision.rationale,
        status: 'resolved',
        anonymous: false,
      });
    }
  }

  return out;
}

export interface ProvenanceGraphPayload {
  objects: Array<
    Pick<ScholarlyObjectBase, 'id' | 'type'> & {
      title: string;
      href?: string;
      subtitle?: string;
    }
  >;
  relationships: KnowledgeRelationship[];
}

function mapClaimEvidenceLabel(rel: ClaimEvidenceLink['relationship']): RelationshipLabel {
  if (rel === 'SUPPORTS') return 'supports';
  if (rel === 'CONTRADICTS') return 'contradicts';
  return 'relates-to';
}

/**
 * Projects canonical v3.4 Sources, Evidence, Claims, Contributions & explicit
 * ClaimEvidence links into `ProvenanceGraph` nodes and labeled edges.
 */
export function toProvenanceGraphData(input: {
  sources: SourceRecord[];
  evidence: EvidenceRecord[];
  claims: ClaimRecord[];
  claimEvidence: ClaimEvidenceLink[];
  contributions?: ContributionRecord[];
}): ProvenanceGraphPayload {
  const objects: ProvenanceGraphPayload['objects'] = [];
  const seenIds = new Set<string>();

  for (const src of input.sources) {
    if (seenIds.has(src.id)) continue;
    seenIds.add(src.id);
    objects.push({
      id: src.id,
      type: 'source',
      title: src.title,
      href: `/source/${src.id}`,
      subtitle: `${src.sourceType} · integrity: ${src.integrityStatus}`,
    });
  }

  for (const ev of input.evidence) {
    if (seenIds.has(ev.id)) continue;
    seenIds.add(ev.id);
    objects.push({
      id: ev.id,
      type: 'evidence',
      title: ev.statement,
      subtitle: `${ev.locator.kind}: ${ev.locator.value}`,
    });
  }

  for (const claim of input.claims) {
    if (seenIds.has(claim.id)) continue;
    seenIds.add(claim.id);
    objects.push({
      id: claim.id,
      type: 'claim',
      title: claim.statement,
      subtitle: `${claim.claimType} claim · ${claim.lifecycle}`,
    });
  }

  for (const contrib of input.contributions ?? []) {
    if (seenIds.has(contrib.id)) continue;
    seenIds.add(contrib.id);
    objects.push({
      id: contrib.id,
      type: 'publication',
      title: contrib.title,
      href: `/contribution/${contrib.slug}`,
      subtitle: `contribution · ${contrib.contributionType}`,
    });
  }

  const relationships: KnowledgeRelationship[] = [];
  const baseRel = {
    type: 'relationship' as const,
    schemaVersion: '3.1' as const,
    objectVersion: 1,
    workspaceId: '00000000-0000-4000-8000-000000000000',
    lifecycle: 'active' as const,
    classification: 'public' as const,
    createdBy: DEFAULT_ASSESSOR_UUID,
    updatedBy: DEFAULT_ASSESSOR_UUID,
  };

  // Source -> Evidence derivation edges
  for (const ev of input.evidence) {
    if (seenIds.has(ev.sourceId)) {
      relationships.push({
        ...baseRel,
        id: `rel-ev-src-${ev.id}`,
        label: 'derives-from',
        fromId: ev.id,
        toId: ev.sourceId,
        inferred: false,
        createdAt: ev.createdAt,
        updatedAt: ev.updatedAt,
      });
    }
  }

  // Explicit ClaimEvidence edges (AI-suggested edges render dashed with explanation!)
  for (const link of input.claimEvidence) {
    if (link.status === 'REJECTED') continue;
    if (!seenIds.has(link.evidenceId) || !seenIds.has(link.claimId)) continue;
    const inferred = link.assertionMethod === 'AI_SUGGESTED' || link.status === 'PROPOSED';
    relationships.push({
      ...baseRel,
      id: `rel-ce-${link.claimId}-${link.evidenceId}-${link.relationship}`,
      label: mapClaimEvidenceLabel(link.relationship),
      fromId: link.evidenceId,
      toId: link.claimId,
      inferred,
      explanation: inferred
        ? `${link.relationship} (${link.status.toLowerCase()} · AI suggested${link.confidence !== null ? ` ${(link.confidence * 100).toFixed(0)}%` : ''})`
        : link.relationship === 'QUALIFIES'
          ? `QUALIFIES — ${link.rationale ?? 'bounds claim scope'}`
          : undefined,
      createdAt: link.createdAt,
      updatedAt: link.createdAt,
    });
  }

  // Contribution -> Source / Claim citation edges
  for (const contrib of input.contributions ?? []) {
    if (contrib.primarySourceId && seenIds.has(contrib.primarySourceId)) {
      relationships.push({
        ...baseRel,
        id: `rel-cs-${contrib.id}-${contrib.primarySourceId}`,
        label: 'cites',
        fromId: contrib.id,
        toId: contrib.primarySourceId,
        inferred: false,
        createdAt: contrib.createdAt,
        updatedAt: contrib.updatedAt,
      });
    }
  }

  return { objects, relationships };
}
