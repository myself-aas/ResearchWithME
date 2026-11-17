/**
 * ResearchWithME v3.4 AI Provenance Ledger & Publication Blocker Engine
 * (`lib/v34/ai-governance.ts`).
 *
 * Implements Part I §16, Part V §6.11, and Part VIII §E:
 *  - Full AI provenance records (provider, model, modelVersion, operation,
 *    promptTemplateVersion, retrievalTime, sourceIds, toolCalls,
 *    generationTimeMs, transformationType, citationValidationStatus,
 *    humanReviewStatus)
 *  - Deterministic citation & quotation verification
 *  - Publication blocker enforcement covering:
 *      1. UNRESOLVED_REQUIRED_SOURCE
 *      2. UNREVIEWED_RETRACTION_IMPACT
 *      3. CITATION_UNSUPPORTED
 *      4. QUOTATION_MISMATCH
 *      5. PROHIBITED_EXTERNAL_PROCESSING
 *      6. UNDISCLOSED_SYNTHETIC_MATERIAL
 */
import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getClaimEvidenceLinks,
  getSourceWithDetails,
  listClaims,
  listEvidence,
  type ContributionRecord,
} from './store';
import { isUuid, runSupabaseMutation } from './supabase-sync';
import type { DataClassification } from './wave6-contracts';

export type AiTransformationType =
  | 'validate-citations'
  | 'check-quotation'
  | 'check-entailment'
  | 'search-expand'
  | 'draft-assist'
  | 'summarize';

export interface AiProvenanceRecord {
  id: string;
  actorId: string | null;
  workspaceId: string | null;
  targetType: 'contribution' | 'draft' | 'claim' | 'evidence' | 'search' | 'citation-check';
  targetId: string;
  provider: string;
  model: string;
  modelVersion: string;
  operation: string;
  promptTemplateVersion: string;
  retrievalTime: string;
  sourceIds: string[];
  toolCalls: Array<{ name: string; status: 'ok' | 'error'; summary: string }>;
  generationTimeMs: number;
  transformationType: AiTransformationType;
  citationValidationStatus: 'PENDING' | 'PASSED' | 'FAILED' | 'NOT_APPLICABLE';
  humanReviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string;
  dataClassification: DataClassification;
  createdAt: string;
}

export interface PublicationBlocker {
  code:
    | 'UNRESOLVED_REQUIRED_SOURCE'
    | 'UNREVIEWED_RETRACTION_IMPACT'
    | 'CITATION_UNSUPPORTED'
    | 'QUOTATION_MISMATCH'
    | 'PROHIBITED_EXTERNAL_PROCESSING'
    | 'UNDISCLOSED_SYNTHETIC_MATERIAL';
  message: string;
  objectId?: string;
}

const APPROVED_RESTRICTED_PROVIDERS = new Set([
  'researchwithme-deterministic-verifier',
  'local-verifier',
  'internal-isolated',
]);

function makeId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(6).toString('hex')}`;
}

function createInitialAiRecords(): Map<string, AiProvenanceRecord> {
  const now = '2026-11-16T12:15:00.000Z';
  return new Map<string, AiProvenanceRecord>([
    [
      'aip-seed-1',
      {
        id: 'aip-seed-1',
        actorId: null,
        workspaceId: 'ws-open-reasoning',
        targetType: 'contribution',
        targetId: 'contrib-rl-cold-start',
        provider: 'researchwithme-deterministic-verifier',
        model: 'citation-integrity-v3.4',
        modelVersion: '3.4.0',
        operation: 'validate-citations',
        promptTemplateVersion: 'citation-check-v1',
        retrievalTime: now,
        sourceIds: ['src-arxiv-2501-12948'],
        toolCalls: [
          {
            name: 'verify_source_versions',
            status: 'ok',
            summary: 'Verified primary source arXiv:2501.12948 v1 active & un-retracted.',
          },
        ],
        generationTimeMs: 4,
        transformationType: 'validate-citations',
        citationValidationStatus: 'PASSED',
        humanReviewStatus: 'APPROVED',
        reviewedBy: 'local-contributor',
        reviewedAt: now,
        reviewNotes: 'Human verified citation alignment and Table 2 locator.',
        dataClassification: 'PUBLIC',
        createdAt: now,
      },
    ],
  ]);
}

let provenanceRecords = createInitialAiRecords();

export function resetAiGovernanceForTesting() {
  provenanceRecords = createInitialAiRecords();
}

export function isProviderPermittedForClassification(
  provider: string,
  classification: DataClassification,
): boolean {
  if (classification === 'PUBLIC' || classification === 'WORKSPACE') {
    return true;
  }
  return APPROVED_RESTRICTED_PROVIDERS.has(provider.trim().toLowerCase());
}

export async function recordAiProvenance(
  input: Omit<AiProvenanceRecord, 'id' | 'createdAt' | 'reviewedBy' | 'reviewedAt' | 'reviewNotes'> & {
    reviewedBy?: string | null;
    reviewedAt?: string | null;
    reviewNotes?: string;
    supabase?: SupabaseClient | null;
  },
): Promise<AiProvenanceRecord> {
  const now = new Date().toISOString();
  const record: AiProvenanceRecord = {
    id: makeId('aip'),
    actorId: input.actorId,
    workspaceId: input.workspaceId,
    targetType: input.targetType,
    targetId: input.targetId,
    provider: input.provider,
    model: input.model,
    modelVersion: input.modelVersion,
    operation: input.operation,
    promptTemplateVersion: input.promptTemplateVersion,
    retrievalTime: input.retrievalTime,
    sourceIds: input.sourceIds,
    toolCalls: input.toolCalls,
    generationTimeMs: input.generationTimeMs,
    transformationType: input.transformationType,
    citationValidationStatus: input.citationValidationStatus,
    humanReviewStatus: input.humanReviewStatus,
    reviewedBy: input.reviewedBy ?? null,
    reviewedAt: input.reviewedAt ?? null,
    reviewNotes: input.reviewNotes ?? '',
    dataClassification: input.dataClassification,
    createdAt: now,
  };
  provenanceRecords.set(record.id, record);

  if (input.supabase) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb.from('v34_ai_provenance_records').insert({
        id: record.id,
        actor_id: record.actorId && isUuid(record.actorId) ? record.actorId : null,
        workspace_id: record.workspaceId,
        target_type: record.targetType,
        target_id: record.targetId,
        provider: record.provider,
        model: record.model,
        model_version: record.modelVersion,
        operation: record.operation,
        prompt_template_version: record.promptTemplateVersion,
        retrieval_time: record.retrievalTime,
        source_ids: record.sourceIds,
        tool_calls: record.toolCalls,
        generation_time_ms: record.generationTimeMs,
        transformation_type: record.transformationType,
        citation_validation_status: record.citationValidationStatus,
        human_review_status: record.humanReviewStatus,
        review_notes: record.reviewNotes,
        data_classification: record.dataClassification,
      }),
    );
  }
  return record;
}

export function listAiProvenance(filter?: { targetId?: string; status?: string }): AiProvenanceRecord[] {
  return [...provenanceRecords.values()]
    .filter((r) => (!filter?.targetId || r.targetId === filter.targetId))
    .filter((r) => (!filter?.status || r.humanReviewStatus === filter.status))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function reviewAiProvenance(input: {
  id: string;
  decision: 'APPROVED' | 'REJECTED';
  reviewNotes: string;
  actorId: string;
  supabase?: SupabaseClient | null;
}): Promise<AiProvenanceRecord | null> {
  const existing = provenanceRecords.get(input.id);
  if (!existing) return null;
  const now = new Date().toISOString();
  const updated: AiProvenanceRecord = {
    ...existing,
    humanReviewStatus: input.decision,
    reviewedBy: input.actorId,
    reviewedAt: now,
    reviewNotes: input.reviewNotes,
  };
  provenanceRecords.set(updated.id, updated);

  if (input.supabase) {
    await runSupabaseMutation(input.supabase, (sb) =>
      sb
        .from('v34_ai_provenance_records')
        .update({
          human_review_status: updated.humanReviewStatus,
          reviewed_by: isUuid(input.actorId) ? input.actorId : null,
          reviewed_at: now,
          review_notes: updated.reviewNotes,
        })
        .eq('id', updated.id),
    );
  }
  return updated;
}

function normalizeForQuotation(text: string): string {
  return text
    .toLowerCase()
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export async function checkQuotation(input: {
  targetId: string;
  sourceId: string;
  quotedText: string;
  sourceExcerpt: string;
  locatorLabel?: string;
  provider: string;
  model: string;
  classification: DataClassification;
  actorId: string;
  supabase?: SupabaseClient | null;
}): Promise<
  | {
      ok: true;
      matched: boolean;
      exactMatch: boolean;
      overlapRatio: number;
      blocker: PublicationBlocker | null;
      provenance: AiProvenanceRecord;
    }
  | { ok: false; status: 403; code: 'PROHIBITED_EXTERNAL_PROCESSING'; message: string }
> {
  if (!isProviderPermittedForClassification(input.provider, input.classification)) {
    return {
      ok: false,
      status: 403,
      code: 'PROHIBITED_EXTERNAL_PROCESSING',
      message: `Data classification ${input.classification} cannot be processed by external provider "${input.provider}".`,
    };
  }

  const started = performance.now();
  const exactMatch = input.sourceExcerpt.includes(input.quotedText);
  const normQuote = normalizeForQuotation(input.quotedText);
  const normExcerpt = normalizeForQuotation(input.sourceExcerpt);
  const normalizedMatch = normQuote.length > 0 && normExcerpt.includes(normQuote);

  const quoteTokens = new Set(normQuote.split(/\W+/).filter((t) => t.length > 2));
  const excerptTokens = new Set(normExcerpt.split(/\W+/).filter((t) => t.length > 2));
  let shared = 0;
  for (const tok of quoteTokens) {
    if (excerptTokens.has(tok)) shared += 1;
  }
  const overlapRatio =
    quoteTokens.size === 0 ? 1 : Number((shared / quoteTokens.size).toFixed(3));
  const matched = exactMatch || normalizedMatch;

  const blocker: PublicationBlocker | null = matched
    ? null
    : {
        code: 'QUOTATION_MISMATCH',
        message: `Quoted passage could not be verified verbatim inside source ${input.sourceId}${input.locatorLabel ? ` (${input.locatorLabel})` : ''} (token overlap ${Math.round(overlapRatio * 100)}%).`,
        objectId: input.sourceId,
      };

  const provenance = await recordAiProvenance({
    actorId: input.actorId,
    workspaceId: null,
    targetType: 'citation-check',
    targetId: input.targetId,
    provider: input.provider,
    model: input.model,
    modelVersion: '3.4.0',
    operation: 'check-quotation',
    promptTemplateVersion: 'quote-verify-v1',
    retrievalTime: new Date().toISOString(),
    sourceIds: [input.sourceId],
    toolCalls: [
      {
        name: 'exact_and_normalized_quote_match',
        status: matched ? 'ok' : 'error',
        summary: matched
          ? exactMatch
            ? 'Exact verbatim quotation match.'
            : 'Normalized punctuation/whitespace quotation match.'
          : `Quotation mismatch (overlap ${Math.round(overlapRatio * 100)}%).`,
      },
    ],
    generationTimeMs: Math.max(1, Math.round(performance.now() - started)),
    transformationType: 'check-quotation',
    citationValidationStatus: matched ? 'PASSED' : 'FAILED',
    humanReviewStatus: 'PENDING',
    dataClassification: input.classification,
    supabase: input.supabase,
  });

  return { ok: true, matched, exactMatch, overlapRatio, blocker, provenance };
}

export async function validateCitations(input: {
  targetType: 'contribution' | 'draft' | 'claim' | 'citation-check';
  targetId: string;
  sourceIds: string[];
  evidenceIds: string[];
  claimIds: string[];
  provider: string;
  model: string;
  classification: DataClassification;
  actorId: string;
  supabase?: SupabaseClient | null;
}): Promise<
  | {
      ok: true;
      passed: boolean;
      blockers: PublicationBlocker[];
      checkedSources: number;
      checkedEvidence: number;
      checkedClaims: number;
      provenance: AiProvenanceRecord;
    }
  | { ok: false; status: 403; code: 'PROHIBITED_EXTERNAL_PROCESSING'; message: string }
> {
  if (!isProviderPermittedForClassification(input.provider, input.classification)) {
    return {
      ok: false,
      status: 403,
      code: 'PROHIBITED_EXTERNAL_PROCESSING',
      message: `Data classification ${input.classification} cannot be sent to external provider "${input.provider}".`,
    };
  }

  const started = performance.now();
  const blockers: PublicationBlocker[] = [];
  const allEvidence = new Map(listEvidence().map((e) => [e.id, e]));
  const allClaims = new Map(listClaims().map((c) => [c.id, c]));
  const links = getClaimEvidenceLinks();

  for (const sourceId of input.sourceIds) {
    const details = await getSourceWithDetails(sourceId);
    if (!details) {
      blockers.push({
        code: 'UNRESOLVED_REQUIRED_SOURCE',
        message: `Referenced source "${sourceId}" does not resolve to a canonical Source record.`,
        objectId: sourceId,
      });
    } else if (details.source.integrityStatus === 'retracted') {
      blockers.push({
        code: 'UNREVIEWED_RETRACTION_IMPACT',
        message: `Source "${details.source.title}" (${sourceId}) is RETRACTED and requires an explicit integrity disposition.`,
        objectId: sourceId,
      });
    }
  }

  for (const evId of input.evidenceIds) {
    const ev = allEvidence.get(evId);
    if (!ev) {
      blockers.push({
        code: 'CITATION_UNSUPPORTED',
        message: `Evidence reference "${evId}" could not be resolved.`,
        objectId: evId,
      });
    } else if (!ev.sourceVersionId || !ev.locator?.value) {
      blockers.push({
        code: 'CITATION_UNSUPPORTED',
        message: `Evidence "${evId}" is missing a canonical SourceVersion or structured locator.`,
        objectId: evId,
      });
    }
  }

  for (const clmId of input.claimIds) {
    if (!allClaims.has(clmId)) {
      blockers.push({
        code: 'CITATION_UNSUPPORTED',
        message: `Claim "${clmId}" could not be resolved.`,
        objectId: clmId,
      });
      continue;
    }
    const acceptedLinks = links.filter(
      (l) => l.claimId === clmId && l.status === 'ACCEPTED',
    );
    if (acceptedLinks.length === 0) {
      blockers.push({
        code: 'CITATION_UNSUPPORTED',
        message: `Claim "${clmId}" has zero human-ACCEPTED evidence links (PROPOSED AI links cannot satisfy citation support).`,
        objectId: clmId,
      });
    }
  }

  const passed = blockers.length === 0;
  const provenance = await recordAiProvenance({
    actorId: input.actorId,
    workspaceId: null,
    targetType: input.targetType,
    targetId: input.targetId,
    provider: input.provider,
    model: input.model,
    modelVersion: '3.4.0',
    operation: 'validate-citations',
    promptTemplateVersion: 'citation-check-v1',
    retrievalTime: new Date().toISOString(),
    sourceIds: input.sourceIds,
    toolCalls: [
      {
        name: 'canonical_citation_integrity_check',
        status: passed ? 'ok' : 'error',
        summary: passed
          ? `All ${input.sourceIds.length} source(s), ${input.evidenceIds.length} evidence unit(s), and ${input.claimIds.length} claim(s) verified.`
          : `${blockers.length} publication blocker(s) detected.`,
      },
    ],
    generationTimeMs: Math.max(1, Math.round(performance.now() - started)),
    transformationType: 'validate-citations',
    citationValidationStatus: passed ? 'PASSED' : 'FAILED',
    humanReviewStatus: 'PENDING',
    dataClassification: input.classification,
    supabase: input.supabase,
  });

  return {
    ok: true,
    passed,
    blockers,
    checkedSources: input.sourceIds.length,
    checkedEvidence: input.evidenceIds.length,
    checkedClaims: input.claimIds.length,
    provenance,
  };
}

/**
 * Evaluates all Part VIII §E publication blockers for a contribution prior to publish.
 */
export async function evaluateContributionPublishBlockers(
  contribution: ContributionRecord,
): Promise<PublicationBlocker[]> {
  const blockers: PublicationBlocker[] = [];

  if (contribution.primarySourceId) {
    const details = await getSourceWithDetails(contribution.primarySourceId);
    if (!details) {
      blockers.push({
        code: 'UNRESOLVED_REQUIRED_SOURCE',
        message: `Primary source "${contribution.primarySourceId}" does not resolve in canonical sources.`,
        objectId: contribution.primarySourceId,
      });
    } else if (details.source.integrityStatus === 'retracted') {
      blockers.push({
        code: 'UNREVIEWED_RETRACTION_IMPACT',
        message: `Cannot publish: primary source "${details.source.title}" is RETRACTED and requires an explicit integrity disposition.`,
        objectId: details.source.id,
      });
    }
  }

  // Check if any quotation check failed for this contribution and was not overridden/approved
  const targetProvenance = listAiProvenance({ targetId: contribution.id });
  for (const rec of targetProvenance) {
    if (
      rec.transformationType === 'check-quotation' &&
      rec.citationValidationStatus === 'FAILED' &&
      rec.humanReviewStatus !== 'APPROVED'
    ) {
      blockers.push({
        code: 'QUOTATION_MISMATCH',
        message: `Contribution has an unresolved quotation mismatch check (${rec.id}) requiring human correction or approval.`,
        objectId: rec.id,
      });
    }
    if (
      rec.transformationType === 'draft-assist' &&
      rec.humanReviewStatus === 'PENDING'
    ) {
      blockers.push({
        code: 'UNDISCLOSED_SYNTHETIC_MATERIAL',
        message: `AI-assisted draft provenance (${rec.id}) requires explicit human approval and disclosure before publishing.`,
        objectId: rec.id,
      });
    }
  }

  return blockers;
}
