/**
 * Pure logic for the OrgChart figure (archetype: tree-expand-org).
 * A hierarchical diagram: nodes expand/collapse to disclose their children;
 * the collapsed shape is the summary, expansion is the detail. Pure tree
 * math — flatten, count, toggle.
 */

export type OrgNode = {
  id: string;
  label: string;
  /** Optional sub-caption (role, kind, scope). */
  role?: string;
  /** Optional unit carried by the count badge (files, people, services). */
  count?: number;
  countUnit?: string;
  children?: OrgNode[];
}

/** The set of expanded node ids after toggling one node. */
export function toggleExpanded(expanded: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(expanded);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/** Every node id in the tree, depth-first. */
export function treeIds(nodes: OrgNode[]): string[] {
  const ids: string[] = [];
  const walk = (list: OrgNode[]) => {
    for (const node of list) {
      ids.push(node.id);
      if (node.children) walk(node.children);
    }
  };
  walk(nodes);
  return ids;
}

/** Expand the first `depth` levels from the roots (used for SSR defaults). */
export function expandToDepth(nodes: OrgNode[], depth: number): Set<string> {
  const expanded = new Set<string>();
  const walk = (list: OrgNode[], level: number) => {
    for (const node of list) {
      if (node.children && level < depth) {
        expanded.add(node.id);
        walk(node.children, level + 1);
      }
    }
  };
  walk(nodes, 0);
  return expanded;
}

/** Total leaf count under a node (its own weight when it has none). */
export function leafCount(node: OrgNode): number {
  if (!node.children || node.children.length === 0) return 1;
  return node.children.reduce((total, child) => total + leafCount(child), 0);
}
