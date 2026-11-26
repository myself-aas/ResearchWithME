/**
 * Pure logic for the FlowDiagram figure (archetype: flow-diagram-trace).
 * A block/flow diagram of positioned nodes and edges; the interaction is a
 * guided trace along a designated path — one node active at a time, the
 * traversed edges lit. Positions are percentages; rendering is pure.
 */

export type FlowNode = {
  id: string;
  label: string;
  /** Horizontal position within the stage, 0–100. */
  x: number;
  /** Vertical position within the stage, 0–100. */
  y: number;
  /** Node kind sets the shape token: start | step | decision | end. */
  kind?: 'start' | 'step' | 'decision' | 'end';
  /** One-line fact revealed when the node is active. */
  note?: string;
}

export type FlowEdge = {
  from: string;
  to: string;
  label?: string;
}

/** The trace order, clamped to nodes that actually exist. */
export function tracePath(path: string[], nodes: FlowNode[]): string[] {
  const ids = new Set(nodes.map((node) => node.id));
  return path.filter((id) => ids.has(id));
}

export function clampStep(step: number, total: number): number {
  if (!Number.isFinite(step)) return 0;
  return Math.min(Math.max(Math.round(step), 0), Math.max(total - 1, 0));
}

/** Edge keys traversed by the first `step + 1` nodes of the trace. */
export function traversedEdges(edges: FlowEdge[], traced: string[], step: number): Set<string> {
  const keys = new Set<string>();
  for (let i = 0; i < Math.min(step, traced.length - 1); i += 1) {
    const key = `${traced[i]}->${traced[i + 1]}`;
    if (edges.some((edge) => `${edge.from}->${edge.to}` === key)) keys.add(key);
  }
  return keys;
}
