/**
 * Provenance graph logic — reme v3.1 §7 / §27.5 (pure, unit-tested).
 * Every edge is labeled; direct edges are solid, inferred edges dashed with
 * an explanation; the list alternative is the canonical accessible view.
 */
import type { KnowledgeRelationship, ScholarlyObjectBase } from '@/lib/schemas/scholarly';

export interface GraphNodeView {
  id: string;
  label: string;
  type: string;
  nodeClass: string;
}

export interface GraphEdgeView {
  from: string;
  to: string;
  label: string;
  inferred: boolean;
  /** solid vs dashed — also conveyed by text, never by style alone */
  lineClass: string;
  explanation?: string;
}

const NODE_TONE: Record<string, string> = {
  source: 'text-graph-node-source',
  'source-version': 'text-graph-node-source',
  evidence: 'text-graph-node-evidence',
  claim: 'text-graph-node-claim',
  annotation: 'text-graph-node-discussion',
  discussion: 'text-graph-node-discussion',
  publication: 'text-graph-node-publication',
  relationship: 'text-graph-node-archived',
};

const EDGE_LABEL: Record<string, string> = {
  cites: 'cites',
  supports: 'supports',
  contradicts: 'contradicts',
  'derives-from': 'derives from',
  'relates-to': 'relates to',
};

export function graphNodes(objects: Array<Pick<ScholarlyObjectBase, 'id' | 'type'> & { title?: string }>): GraphNodeView[] {
  return objects.map((o) => ({
    id: o.id,
    label: o.title ?? o.id.slice(0, 8),
    type: o.type,
    nodeClass: NODE_TONE[o.type] ?? 'text-graph-node-archived',
  }));
}

export function graphEdges(relationships: KnowledgeRelationship[]): GraphEdgeView[] {
  return relationships.map((r) => ({
    from: r.fromId,
    to: r.toId,
    label: EDGE_LABEL[r.label] ?? r.label,
    inferred: r.inferred,
    lineClass: r.inferred ? '[stroke-dasharray:4]' : '',
    explanation: r.explanation,
  }));
}

/** Canonical list/table alternative rows (§27.5) — the accessible equivalent. */
export interface GraphListRow {
  subject: string;
  relationship: string;
  object: string;
  note?: string;
}

export function graphListRows(
  relationships: KnowledgeRelationship[],
  nodeLabel: (id: string) => string,
): GraphListRow[] {
  return graphEdges(relationships).map((e) => ({
    subject: nodeLabel(e.from),
    relationship: e.inferred ? `${e.label} (inferred)` : e.label,
    object: nodeLabel(e.to),
    note: e.explanation,
  }));
}
