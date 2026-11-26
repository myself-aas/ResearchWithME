'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import FigureChrome, { READOUT_CLASS } from './FigureChrome';
import { expandToDepth, leafCount, toggleExpanded, treeIds, type OrgNode } from '@/lib/figures/tree';

/**
 * OrgChart — archetype `tree-expand-org`.
 *
 * A hierarchical diagram (org structure, module tree, responsibility map):
 * each node expands to disclose its children; collapsed nodes keep a leaf
 * count so nothing is hidden, only folded. Where the layer stack opens one
 * layer of a flat list, this figure discloses *depth* — the tree is the
 * structure. SSR renders the first two levels expanded.
 */
export default function OrgChart({
  title,
  subtitle,
  root,
}: {
  title: string;
  subtitle: string;
  /** One or more top-level nodes. */
  root: OrgNode[];
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => expandToDepth(root, 2));

  return (
    <FigureChrome title={title} subtitle={subtitle}>
      <ul className="flex flex-col gap-2" role="tree">
        {root.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            depth={0}
            expanded={expanded}
            onToggle={(id) => setExpanded((current) => toggleExpanded(current, id))}
          />
        ))}
      </ul>
      <p aria-live="polite" className={`${READOUT_CLASS} mt-4`}>
        {expanded.size} of {treeIds(root).length} nodes expanded — the count under a collapsed node
        stays visible, so folding hides nothing.
      </p>
    </FigureChrome>
  );
}

function TreeNode({
  node,
  depth,
  expanded,
  onToggle,
}: {
  node: OrgNode;
  depth: number;
  expanded: ReadonlySet<string>;
  onToggle: (id: string) => void;
}) {
  const hasChildren = Boolean(node.children?.length);
  const isOpen = expanded.has(node.id);
  const leaves = leafCount(node);
  return (
    <li
      className={depth > 0 ? 'ml-5 border-l border-line pl-4' : ''}
      role="treeitem"
      aria-selected="false"
      aria-expanded={hasChildren ? isOpen : undefined}
    >
      {hasChildren ? (
        <button
          type="button"
          onClick={() => onToggle(node.id)}
          aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${node.label}`}
          className="flex min-h-9 w-full items-center gap-2 rounded-xl border border-transparent px-2.5 py-2 text-left transition-colors hover:border-line hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-ink-secondary transition-transform duration-200 ease-standard motion-reduce:transition-none ${
              isOpen ? 'rotate-0' : '-rotate-90'
            }`}
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1">
            <span className="block font-sans text-sm font-semibold text-ink">{node.label}</span>
            {node.role && <span className="block font-sans text-xs text-ink-secondary">{node.role}</span>}
          </span>
          {node.count !== undefined && (
            <span className="shrink-0 rounded-full border border-line bg-canvas px-2 py-0.5 font-mono text-[0.6875rem] text-ink-secondary">
              {node.count} {node.countUnit ?? ''}
            </span>
          )}
          <span className="shrink-0 font-mono text-[0.6875rem] text-ink-secondary" aria-label={`${leaves} leaf units`}>
            {leaves}
          </span>
        </button>
      ) : (
        <span className="flex min-h-9 w-full items-center gap-2 px-2.5 py-2">
          <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
          <span className="min-w-0 flex-1">
            <span className="block font-sans text-sm text-ink">{node.label}</span>
            {node.role && <span className="block font-sans text-xs text-ink-secondary">{node.role}</span>}
          </span>
          {node.count !== undefined && (
            <span className="shrink-0 rounded-full border border-line bg-canvas px-2 py-0.5 font-mono text-[0.6875rem] text-ink-secondary">
              {node.count} {node.countUnit ?? ''}
            </span>
          )}
        </span>
      )}
      {hasChildren && isOpen && (
        <ul className="mt-1 flex flex-col gap-1" role="group">
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
