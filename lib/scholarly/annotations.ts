/**
 * Annotation anchor revalidation + conflict helpers — πeme v3.1 §29/§34 (pure logic).
 */
import type { AnnotationAnchor } from '@/lib/schemas/annotations';

export type AnchorState = 'valid' | 'drifted' | 'unresolved';

export interface SourceText {
  sourceVersionId: string;
  text: string;
}

/**
 * Revalidate an anchor against the current source-version text.
 * - quote still present → 'valid'
 * - quote absent but a similar prefix/suffix neighborhood exists → 'drifted'
 * - nothing identifiable remains → 'unresolved'
 * The anchor is NEVER silently relocated: we only report state.
 */
export function revalidateAnchor(anchor: AnnotationAnchor, source: SourceText): AnchorState {
  if (anchor.sourceVersionId !== source.sourceVersionId) return 'unresolved';
  const { exact, prefix, suffix } = anchor.textQuote;
  if (source.text.includes(exact)) return 'valid';
  const context = [prefix, suffix].filter((s): s is string => Boolean(s));
  if (context.length && context.some((c) => source.text.includes(c))) return 'drifted';
  return 'unresolved';
}

/** Checksum of the anchored slice, for drift detection across versions. */
export function anchorChecksum(text: string, start: number, end: number): string {
  const slice = text.slice(Math.max(0, start), Math.max(0, end));
  let h = 0x811c9dc5;
  for (let i = 0; i < slice.length; i++) {
    h ^= slice.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `fnv1a-${h.toString(16).padStart(8, '0')}`;
}

export interface ConflictRecord<S extends { label: string; values: Record<string, unknown> }> {
  sides: [S, S];
  selected: Record<string, unknown>;
  rationale: string;
}

/**
 * Merge a conflict: both sides are preserved in the record; `selected` picks
 * the winning values; rationale is mandatory (§34).
 */
export function resolveConflict<S extends { label: string; values: Record<string, unknown> }>(
  a: S,
  b: S,
  selected: Record<string, unknown>,
  rationale: string,
): ConflictRecord<S> {
  if (!rationale.trim()) throw new Error('Conflict resolution requires a rationale (§34)');
  for (const key of Object.keys(selected)) {
    const inA = key in a.values;
    const inB = key in b.values;
    if (!inA && !inB) throw new Error(`Selected key "${key}" exists in neither side — both versions must be preserved`);
  }
  return { sides: [a, b], selected, rationale };
}
