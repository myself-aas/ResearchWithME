/**
 * Editor & annotation schemas — reme v3.1 §29/§34 (hand-rolled validators,
 * same pattern as lib/schemas/scholarly.ts).
 *
 * AnnotationAnchor (§29): anchors combine sourceVersionId + structural path +
 * text quote (+ optional position/checksum). Anchors MUST be revalidated
 * after source updates; broken anchors are marked `unresolved` — never
 * silently relocated.
 *
 * ConflictResolution (§34): conflicts MUST preserve both versions and record
 * author, timestamp, selected values, and rationale.
 */

export type ObjectId = string;
export type ISODateTime = string;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

export interface TextQuote {
  exact: string;
  prefix?: string;
  suffix?: string;
}

export interface AnnotationAnchor {
  sourceVersionId: ObjectId;
  structuralPath?: string;
  textQuote: TextQuote;
  position?: { start: number; end: number };
  checksum?: string;
}

export type AnchorState = 'valid' | 'drifted' | 'unresolved';

export interface Annotation {
  id: ObjectId;
  workspaceId: ObjectId;
  anchor: AnnotationAnchor;
  anchorState: AnchorState;
  body: string;
  kind: 'note' | 'highlight' | 'comment' | 'suggestion';
  authorId: ObjectId;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface ConflictSide {
  label: string;
  values: Record<string, unknown>;
  capturedAt: ISODateTime;
  authorId: ObjectId;
}

export interface ConflictResolution {
  id: ObjectId;
  objectId: ObjectId;
  /** both versions are preserved — resolution never deletes a side */
  sides: [ConflictSide, ConflictSide];
  selected: Record<string, unknown>;
  rationale: string;
  resolvedBy: ObjectId;
  resolvedAt: ISODateTime;
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

const errs: string[] = [];
const push = (cond: boolean, msg: string) => { if (!cond) errs.push(msg); };

export function validateAnnotationAnchor(v: unknown): ValidationResult<AnnotationAnchor> {
  errs.length = 0;
  const a = v as AnnotationAnchor;
  push(!!a && typeof a === 'object', 'anchor must be an object');
  push(typeof a?.sourceVersionId === 'string' && UUID_RE.test(a.sourceVersionId), 'sourceVersionId must be a UUID');
  push(typeof a?.textQuote?.exact === 'string' && a.textQuote.exact.length > 0, 'textQuote.exact required');
  push(a?.position === undefined || (Number.isInteger(a.position.start) && Number.isInteger(a.position.end) && a.position.start >= 0 && a.position.end >= a.position.start), 'position must be start>=0, end>=start');
  return errs.length ? { ok: false, errors: [...errs] } : { ok: true, value: a };
}

export function validateAnnotation(v: unknown): ValidationResult<Annotation> {
  errs.length = 0;
  const a = v as Annotation;
  push(typeof a?.id === 'string' && UUID_RE.test(a.id), 'id must be a UUID');
  push(typeof a?.workspaceId === 'string' && UUID_RE.test(a.workspaceId), 'workspaceId must be a UUID');
  const anchor = validateAnnotationAnchor(a?.anchor);
  if (!anchor.ok) anchor.errors.forEach((e) => push(false, e));
  push(['valid', 'drifted', 'unresolved'].includes(a?.anchorState), 'anchorState must be valid|drifted|unresolved');
  push(typeof a?.body === 'string' && a.body.length > 0, 'body required');
  push(['note', 'highlight', 'comment', 'suggestion'].includes(a?.kind), 'kind invalid');
  push(typeof a?.authorId === 'string' && UUID_RE.test(a.authorId), 'authorId must be a UUID');
  push(typeof a?.createdAt === 'string' && ISO_RE.test(a.createdAt), 'createdAt must be ISO 8601');
  push(typeof a?.updatedAt === 'string' && ISO_RE.test(a.updatedAt), 'updatedAt must be ISO 8601');
  return errs.length ? { ok: false, errors: [...errs] } : { ok: true, value: a };
}

export function validateConflictSide(v: unknown): ValidationResult<ConflictSide> {
  errs.length = 0;
  const s = v as ConflictSide;
  push(typeof s?.label === 'string' && s.label.length > 0, 'label required');
  push(!!s?.values && typeof s.values === 'object', 'values object required');
  push(typeof s?.capturedAt === 'string' && ISO_RE.test(s.capturedAt), 'capturedAt must be ISO 8601');
  push(typeof s?.authorId === 'string' && UUID_RE.test(s.authorId), 'authorId must be a UUID');
  return errs.length ? { ok: false, errors: [...errs] } : { ok: true, value: s };
}

export function validateConflictResolution(v: unknown): ValidationResult<ConflictResolution> {
  errs.length = 0;
  const c = v as ConflictResolution;
  push(typeof c?.id === 'string' && UUID_RE.test(c.id), 'id must be a UUID');
  push(typeof c?.objectId === 'string' && UUID_RE.test(c.objectId), 'objectId must be a UUID');
  push(Array.isArray(c?.sides) && c.sides.length === 2, 'exactly two sides must be preserved');
  if (Array.isArray(c?.sides)) {
    c.sides.forEach((s, i) => {
      const r = validateConflictSide(s);
      if (!r.ok) r.errors.forEach((e) => push(false, `sides[${i}]: ${e}`));
    });
  }
  push(!!c?.selected && typeof c.selected === 'object', 'selected values required');
  push(typeof c?.rationale === 'string' && c.rationale.trim().length > 0, 'rationale required (§34)');
  push(typeof c?.resolvedBy === 'string' && UUID_RE.test(c.resolvedBy), 'resolvedBy must be a UUID');
  push(typeof c?.resolvedAt === 'string' && ISO_RE.test(c.resolvedAt), 'resolvedAt must be ISO 8601');
  return errs.length ? { ok: false, errors: [...errs] } : { ok: true, value: c };
}
