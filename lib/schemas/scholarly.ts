/**
 * Canonical scholarly domain schemas — πeme v3.1 §22 (normative Part II).
 * Runtime-validated, framework-free, following repo conventions
 * (discriminated-union results, no exceptions for validation).
 *
 * Invariants enforced here:
 *  - ISO 8601 UTC timestamps only; non-negative object versions.
 *  - Evidence MUST reference a source version and an exact source location,
 *    carry an extraction type and an assessment; `inferred` evidence MUST
 *    carry a limitation.
 *  - Associative evidence MUST NOT be promoted to a causal claim.
 *  - Trust dimensions (review, replication, certainty, consensus, integrity)
 *    stay independent — never compressed into one score.
 */

import { normalizeIdentifier, type IdentifierScheme, type NormalizedIdentifier } from './identifiers';

export type ISODateTime = string;
export type ObjectId = string;
export type WorkspaceId = string;
export type UserId = string;

export type ScholarlyObjectType =
  | 'research-project'
  | 'research-question'
  | 'source'
  | 'source-version'
  | 'evidence'
  | 'claim'
  | 'annotation'
  | 'dataset'
  | 'software'
  | 'protocol'
  | 'review'
  | 'review-item'
  | 'rebuttal'
  | 'decision'
  | 'publication'
  | 'contribution'
  | 'relationship';

export type LifecycleState =
  | 'draft'
  | 'active'
  | 'under-review'
  | 'validated'
  | 'published'
  | 'superseded'
  | 'withdrawn'
  | 'archived';

export type DataClassification = 'public' | 'workspace' | 'confidential' | 'restricted' | 'embargoed';

/** Capability-based authorization decision (spec §24) — always server-issued. */
export interface PermissionDecision {
  capability: string;
  granted: boolean;
  reason?: string;
}

// ── §23 Multidimensional trust — dimensions stay independent ───────────────

export type SourceIntegrityStatus = 'active' | 'corrected' | 'expression-of-concern' | 'retracted' | 'withdrawn';
export type ReviewStatus = 'not-reviewed' | 'editorially-reviewed' | 'peer-reviewed';
export type ReplicationStatus = 'not-assessed' | 'replicated' | 'partially-replicated' | 'failed-to-replicate';
export type Certainty = 'very-low' | 'low' | 'moderate' | 'high';
export type Consensus = 'unknown' | 'emerging' | 'mixed' | 'broad' | 'contested';

export interface EvidenceAssessment {
  review: ReviewStatus;
  replication: ReplicationStatus;
  certainty: Certainty;
  consensus: Consensus;
  sourceIntegrity: SourceIntegrityStatus;
  assessedBy: UserId;
  assessedAt: ISODateTime;
  /** documented assessment method — required so "verified" is never unexplained */
  method: string;
  rationale?: string;
}

export interface ClaimAssessment extends EvidenceAssessment {
  evidenceCount: number;
  contradictionCount: number;
  lastRecomputedAt: ISODateTime;
}

const REVIEWS: ReviewStatus[] = ['not-reviewed', 'editorially-reviewed', 'peer-reviewed'];
const REPLICATIONS: ReplicationStatus[] = ['not-assessed', 'replicated', 'partially-replicated', 'failed-to-replicate'];
const CERTAINTIES: Certainty[] = ['very-low', 'low', 'moderate', 'high'];
const CONSENSUS: Consensus[] = ['unknown', 'emerging', 'mixed', 'broad', 'contested'];
const INTEGRITY: SourceIntegrityStatus[] = ['active', 'corrected', 'expression-of-concern', 'retracted', 'withdrawn'];

/**
 * §23: "not assessed" MUST be distinguishable from a negative result.
 * Returns false for 'not-assessed'/'not-reviewed'/'unknown' — those are
 * absences of evidence, not negative findings.
 */
export function isNegativeAssessment(value: string): boolean {
  return ['failed-to-replicate', 'contested', 'retracted', 'withdrawn', 'expression-of-concern', 'very-low'].includes(value);
}

export function validateEvidenceAssessment(input: object): Result<EvidenceAssessment> {
  const rec = input as Record<string, unknown>;
  const e: Record<string, string> = {};
  if (typeof rec.review !== 'string' || !REVIEWS.includes(rec.review as ReviewStatus)) e.review = 'unknown review status';
  if (typeof rec.replication !== 'string' || !REPLICATIONS.includes(rec.replication as ReplicationStatus)) e.replication = 'unknown replication status';
  if (typeof rec.certainty !== 'string' || !CERTAINTIES.includes(rec.certainty as Certainty)) e.certainty = 'unknown certainty';
  if (typeof rec.consensus !== 'string' || !CONSENSUS.includes(rec.consensus as Consensus)) e.consensus = 'unknown consensus';
  if (typeof rec.sourceIntegrity !== 'string' || !INTEGRITY.includes(rec.sourceIntegrity as SourceIntegrityStatus)) e.sourceIntegrity = 'unknown integrity state';
  if (!isUuid(rec.assessedBy)) e.assessedBy = 'assessedBy must be a UUID';
  if (!isIsoUtc(rec.assessedAt)) e.assessedAt = 'assessedAt must be ISO 8601 UTC';
  if (!isNonEmptyString(rec.method)) e.method = 'a documented assessment method is required';
  if (Object.keys(e).length) return err('invalid evidence assessment', e);
  return ok(input as unknown as EvidenceAssessment);
}

export type Result<T> = { ok: true; value: T } | { ok: false; message: string; fieldErrors?: Record<string, string> };

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const err = <T>(message: string, fieldErrors?: Record<string, string>): Result<T> => ({ ok: false, message, fieldErrors });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

const isUuid = (s: unknown): s is string => typeof s === 'string' && UUID_RE.test(s);
const isIsoUtc = (s: unknown): s is ISODateTime => typeof s === 'string' && ISO_UTC_RE.test(s) && !Number.isNaN(Date.parse(s));
const isNonEmptyString = (s: unknown): s is string => typeof s === 'string' && s.trim().length > 0;

const LIFECYCLES: LifecycleState[] = ['draft', 'active', 'under-review', 'validated', 'published', 'superseded', 'withdrawn', 'archived'];
const CLASSIFICATIONS: DataClassification[] = ['public', 'workspace', 'confidential', 'restricted', 'embargoed'];

export interface ScholarlyObjectBase {
  id: ObjectId;
  type: ScholarlyObjectType;
  schemaVersion: '3.1';
  objectVersion: number;
  workspaceId: WorkspaceId;
  lifecycle: LifecycleState;
  classification: DataClassification;
  createdAt: ISODateTime;
  createdBy: UserId;
  updatedAt: ISODateTime;
  updatedBy: UserId;
  deletedAt?: ISODateTime;
  deletionReason?: string;
}

function validateBase(input: Record<string, unknown>, type: ScholarlyObjectType): Result<ScholarlyObjectBase> {
  const fieldErrors: Record<string, string> = {};
  if (!isUuid(input.id)) fieldErrors.id = 'id must be a UUID';
  if (input.type !== type) fieldErrors.type = `type must be "${type}"`;
  if (input.schemaVersion !== '3.1') fieldErrors.schemaVersion = 'schemaVersion must be "3.1"';
  if (typeof input.objectVersion !== 'number' || !Number.isInteger(input.objectVersion) || input.objectVersion < 0)
    fieldErrors.objectVersion = 'objectVersion must be a non-negative integer';
  if (!isUuid(input.workspaceId)) fieldErrors.workspaceId = 'workspaceId must be a UUID';
  if (typeof input.lifecycle !== 'string' || !LIFECYCLES.includes(input.lifecycle as LifecycleState))
    fieldErrors.lifecycle = 'unknown lifecycle state';
  if (typeof input.classification !== 'string' || !CLASSIFICATIONS.includes(input.classification as DataClassification))
    fieldErrors.classification = 'unknown data classification';
  if (!isIsoUtc(input.createdAt)) fieldErrors.createdAt = 'createdAt must be ISO 8601 UTC (…Z)';
  if (!isIsoUtc(input.updatedAt)) fieldErrors.updatedAt = 'updatedAt must be ISO 8601 UTC (…Z)';
  if (!isUuid(input.createdBy)) fieldErrors.createdBy = 'createdBy must be a UUID';
  if (!isUuid(input.updatedBy)) fieldErrors.updatedBy = 'updatedBy must be a UUID';
  if (input.deletedAt !== undefined && !isIsoUtc(input.deletedAt)) fieldErrors.deletedAt = 'deletedAt must be ISO 8601 UTC (…Z)';
  if (Object.keys(fieldErrors).length) return err('invalid scholarly object base', fieldErrors);
  return ok(input as unknown as ScholarlyObjectBase);
}

// ── §22.2 External identifiers ──────────────────────────────────────────────

export type ExternalIdentifier = NormalizedIdentifier & {
  sourceVersion?: string;
  resolutionStatus: 'resolved' | 'unresolved' | 'invalid' | 'temporarily-unavailable';
  resolvedAt?: ISODateTime;
};

export function validateExternalIdentifier(input: {
  scheme: IdentifierScheme;
  value: string;
  resolutionStatus?: ExternalIdentifier['resolutionStatus'];
  resolvedAt?: string;
  sourceVersion?: string;
}): Result<ExternalIdentifier> {
  if (!isNonEmptyString(input.value)) return err('identifier value required');
  const norm = normalizeIdentifier(input.scheme, input.value);
  if (!norm.ok) return err(norm.message, { value: norm.message });
  const status: ExternalIdentifier['resolutionStatus'] = input.resolutionStatus ?? 'unresolved';
  if (!['resolved', 'unresolved', 'invalid', 'temporarily-unavailable'].includes(status))
    return err('unknown resolutionStatus', { resolutionStatus: 'unknown resolutionStatus' });
  if (input.resolvedAt !== undefined && !isIsoUtc(input.resolvedAt))
    return err('resolvedAt must be ISO 8601 UTC', { resolvedAt: 'must be ISO 8601 UTC' });
  return ok({ ...norm.value, sourceVersion: input.sourceVersion, resolutionStatus: status, resolvedAt: input.resolvedAt as ISODateTime | undefined });
}

// ── §22.3 Source / SourceVersion ────────────────────────────────────────────

export type SourceType =
  | 'article' | 'book' | 'chapter' | 'dataset' | 'preprint' | 'software' | 'protocol' | 'webpage' | 'thesis' | 'report';
export type AccessState = 'open' | 'subscription' | 'restricted' | 'unknown';

export interface ContributorRef {
  name: string;
  orcid?: string;
  role?: string;
  affiliation?: string;
}

export interface Source extends ScholarlyObjectBase {
  type: 'source';
  title: string;
  translatedTitle?: string;
  transliteratedTitle?: string;
  language: string; // BCP 47
  sourceType: SourceType;
  identifiers: ExternalIdentifier[];
  contributors: ContributorRef[];
  currentVersionId: ObjectId;
  access: AccessState;
}

export type SourceIntegrity = {
  retractionStatus: 'none' | 'corrected' | 'retracted' | 'under-investigation';
  checksumVerified?: boolean;
  notes?: string;
};

export interface SourceVersion extends ScholarlyObjectBase {
  type: 'source-version';
  sourceId: ObjectId;
  versionLabel: string;
  publishedAt?: ISODateTime;
  retrievedAt?: ISODateTime;
  checksum?: string;
  integrity: SourceIntegrity;
  replacesVersionId?: ObjectId;
  contentLocator?: string;
}

const SOURCE_TYPES: SourceType[] = ['article', 'book', 'chapter', 'dataset', 'preprint', 'software', 'protocol', 'webpage', 'thesis', 'report'];
const ACCESS_STATES: AccessState[] = ['open', 'subscription', 'restricted', 'unknown'];
const BCP47_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/i;

export function validateSource(input: Record<string, unknown>): Result<Source> {
  const base = validateBase(input, 'source');
  if (!base.ok) return err(base.message, base.fieldErrors);
  const e: Record<string, string> = {};
  if (!isNonEmptyString(input.title)) e.title = 'title required';
  if (typeof input.language !== 'string' || !BCP47_RE.test(input.language)) e.language = 'language must be a BCP 47 tag';
  if (typeof input.sourceType !== 'string' || !SOURCE_TYPES.includes(input.sourceType as SourceType)) e.sourceType = 'unknown sourceType';
  if (!Array.isArray(input.identifiers)) e.identifiers = 'identifiers must be an array';
  if (!Array.isArray(input.contributors)) e.contributors = 'contributors must be an array';
  if (!isUuid(input.currentVersionId)) e.currentVersionId = 'currentVersionId must be a UUID';
  if (typeof input.access !== 'string' || !ACCESS_STATES.includes(input.access as AccessState)) e.access = 'unknown access state';
  if (Object.keys(e).length) return err('invalid source', e);
  return ok(input as unknown as Source);
}

// ── Evidence / Claim / Relationships / Integrity / Audit ───────────────────

export type ExtractionType = 'quoted' | 'extracted' | 'inferred' | 'generated';
export type Assessment = 'supports' | 'contradicts' | 'neutral' | 'unassessed';

export interface SourceLocator {
  kind: 'page' | 'section' | 'figure' | 'table' | 'timestamp' | 'dataset-row' | 'commit' | 'paragraph';
  value: string;
}

export interface Evidence extends ScholarlyObjectBase {
  type: 'evidence';
  sourceVersionId: ObjectId;
  locator: SourceLocator;
  statement: string;
  extractionType: ExtractionType;
  assessment: Assessment;
  limitation?: string;
  aiProvenance?: AIProvenance;
  quotation?: string;
}

export interface AIProvenance {
  provider: string;
  model: string;
  operation: string;
  sourceSet: string[];
  toolCalls?: string[];
  generatedAt: ISODateTime;
  transformationType: ExtractionType;
  citationValidation: 'passed' | 'failed' | 'unresolved';
  humanApproval: { reviewerId: UserId; approvedAt: ISODateTime } | null;
}

export type ClaimType = 'observational' | 'associative' | 'causal' | 'definitional';

export interface Claim extends ScholarlyObjectBase {
  type: 'claim';
  text: string;
  claimType: ClaimType;
  supportingEvidenceIds: ObjectId[];
  contradictingEvidenceIds: ObjectId[];
}

export type RelationshipLabel = 'cites' | 'supports' | 'contradicts' | 'derives-from' | 'relates-to';

export interface KnowledgeRelationship extends ScholarlyObjectBase {
  type: 'relationship';
  label: RelationshipLabel;
  fromId: ObjectId;
  toId: ObjectId;
  /** direct = solid edge; inferred = dashed + explanation (spec §7) */
  inferred: boolean;
  explanation?: string;
}

export type IntegrityEventType = 'correction' | 'retraction' | 'expression-of-concern' | 'investigation-opened';

/** Integrity events drive retraction/correction propagation (spec §25). */
export interface IntegrityEvent {
  id: ObjectId;
  at: ISODateTime;
  eventType: IntegrityEventType;
  sourceId: ObjectId;
  sourceVersionId: ObjectId;
  /** original version is preserved; affected dependents are marked for review */
  affectedObjectIds: ObjectId[];
  disposition?: 'preserved-and-marked' | 'publication-blocked' | 'resolved';
  recordedBy: UserId;
}

export interface AuditEvent {
  id: ObjectId;
  at: ISODateTime;
  actorId: UserId;
  action: string;
  objectId: ObjectId;
  objectType: ScholarlyObjectType;
  workspaceId: WorkspaceId;
  detail?: Record<string, unknown>;
}

const EXTRACTION_TYPES: ExtractionType[] = ['quoted', 'extracted', 'inferred', 'generated'];
const ASSESSMENTS: Assessment[] = ['supports', 'contradicts', 'neutral', 'unassessed'];
const CLAIM_TYPES: ClaimType[] = ['observational', 'associative', 'causal', 'definitional'];
const REL_LABELS: RelationshipLabel[] = ['cites', 'supports', 'contradicts', 'derives-from', 'relates-to'];
const LOCATOR_KINDS: SourceLocator['kind'][] = ['page', 'section', 'figure', 'table', 'timestamp', 'dataset-row', 'commit', 'paragraph'];

/**
 * Evidence validator — spec §22.4/§17: evidence MUST resolve to a source
 * version and an exact location; `inferred` evidence MUST carry a limitation.
 */
export function validateEvidence(input: Record<string, unknown>): Result<Evidence> {
  const base = validateBase(input, 'evidence');
  if (!base.ok) return err(base.message, base.fieldErrors);
  const e: Record<string, string> = {};
  if (!isUuid(input.sourceVersionId)) e.sourceVersionId = 'evidence must reference a source version (UUID)';
  const loc = input.locator as SourceLocator | undefined;
  if (!loc || typeof loc !== 'object' || !LOCATOR_KINDS.includes(loc.kind) || !isNonEmptyString(loc.value))
    e.locator = 'exact source location required (kind + value)';
  if (!isNonEmptyString(input.statement)) e.statement = 'evidence statement required';
  if (typeof input.extractionType !== 'string' || !EXTRACTION_TYPES.includes(input.extractionType as ExtractionType))
    e.extractionType = 'unknown extractionType';
  if (typeof input.assessment !== 'string' || !ASSESSMENTS.includes(input.assessment as Assessment))
    e.assessment = 'assessment required (never "not assessed" rendered as a result)';
  if (input.extractionType === 'inferred' && !isNonEmptyString(input.limitation))
    e.limitation = 'inferred evidence MUST carry a limitation';
  if (Object.keys(e).length) return err('invalid evidence', e);
  return ok(input as unknown as Evidence);
}

/**
 * Claim validator — spec §22: associative evidence MUST NOT be promoted to
 * a causal claim. A causal claim requires at least one supporting evidence id
 * (the caller passes resolved evidence; here we enforce the type rule).
 */
export function validateClaim(
  input: Record<string, unknown>,
  supportingEvidence?: Array<Pick<Evidence, 'extractionType'>>,
): Result<Claim> {
  const base = validateBase(input, 'claim');
  if (!base.ok) return err(base.message, base.fieldErrors);
  const e: Record<string, string> = {};
  if (!isNonEmptyString(input.text)) e.text = 'claim text required';
  if (typeof input.claimType !== 'string' || !CLAIM_TYPES.includes(input.claimType as ClaimType)) e.claimType = 'unknown claimType';
  if (!Array.isArray(input.supportingEvidenceIds) || !Array.isArray(input.contradictingEvidenceIds))
    e.supportingEvidenceIds = 'supporting/contradicting evidence id arrays required';
  if (input.claimType === 'causal' && supportingEvidence) {
    const nonAssociative = supportingEvidence.some((ev) => ev.extractionType === 'quoted' || ev.extractionType === 'extracted');
    if (!nonAssociative) e.claimType = 'causal claim requires non-associative (quoted/extracted) supporting evidence';
  }
  if (Object.keys(e).length) return err('invalid claim', e);
  return ok(input as unknown as Claim);
}

export function validateKnowledgeRelationship(input: Record<string, unknown>): Result<KnowledgeRelationship> {
  const base = validateBase(input, 'relationship');
  if (!base.ok) return err(base.message, base.fieldErrors);
  const e: Record<string, string> = {};
  if (typeof input.label !== 'string' || !REL_LABELS.includes(input.label as RelationshipLabel)) e.label = 'every edge must be labeled';
  if (!isUuid(input.fromId) || !isUuid(input.toId)) e.fromId = 'fromId/toId must be UUIDs';
  if (typeof input.inferred !== 'boolean') e.inferred = 'inferred flag required';
  if (input.inferred === true && !isNonEmptyString(input.explanation)) e.explanation = 'inferred (dashed) edges require an explanation';
  if (Object.keys(e).length) return err('invalid relationship', e);
  return ok(input as unknown as KnowledgeRelationship);
}

export function validateAuditEvent(input: Record<string, unknown>): Result<AuditEvent> {
  const e: Record<string, string> = {};
  if (!isUuid(input.id)) e.id = 'id must be a UUID';
  if (!isIsoUtc(input.at)) e.at = 'at must be ISO 8601 UTC';
  if (!isUuid(input.actorId)) e.actorId = 'actorId must be a UUID';
  if (!isNonEmptyString(input.action)) e.action = 'action required';
  if (!isUuid(input.objectId)) e.objectId = 'objectId must be a UUID';
  if (!isUuid(input.workspaceId)) e.workspaceId = 'workspaceId must be a UUID';
  if (Object.keys(e).length) return err('invalid audit event', e);
  return ok(input as unknown as AuditEvent);
}
