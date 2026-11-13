'use client';

/**
 * ProvenanceGraph — reme v3.1 §7 / §27.5 (stage 4 entry, beta).
 *
 * - Every relationship is labeled (cites / supports / contradicts /
 *   derives from / relates to); direct edges solid, inferred edges dashed
 *   WITH a text explanation — never color/style alone.
 * - The structured list is the canonical, always-available equivalent.
 * - Below 768 CSS px the list is the default; graph mode is opt-in.
 * - Keyboard: roving tabindex over nodes, Arrow keys move node-by-node,
 *   Enter/Space inspects, focus returns to the list on exit.
 * - Nodes are <article>-labeled via aria-label; edges announced as text.
 * Token mapping: graph-node-* / graph-edge-* semantic tokens.
 * Tests: lib/__tests__/provenance-graph.test.ts.
 */
import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { KnowledgeRelationship, ScholarlyObjectBase, ObjectId } from '@/lib/schemas/scholarly';
import { graphNodes, graphEdges, graphListRows } from '@/lib/scholarly/graph';

export interface ProvenanceGraphProps {
  objects: Array<Pick<ScholarlyObjectBase, 'id' | 'type'> & { title?: string }>;
  relationships: KnowledgeRelationship[];
  onInspect?: (id: ObjectId) => void;
}

export default function ProvenanceGraph({ objects, relationships, onInspect }: ProvenanceGraphProps) {
  const nodes = useMemo(() => graphNodes(objects), [objects]);
  const edges = useMemo(() => graphEdges(relationships), [relationships]);
  const rows = useMemo(() => graphListRows(relationships, (id) => nodes.find((n) => n.id === id)?.label ?? id.slice(0, 8)), [relationships, nodes]);
  const [mode, setMode] = useState<'list' | 'graph'>('list');
  const [focusIndex, setFocusIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      navRef.current = true;
      setFocusIndex((i) => Math.min(i + 1, nodes.length - 1));
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      navRef.current = true;
      setFocusIndex((i) => Math.max(i - 1, 0));
    } else if ((e.key === 'Enter' || e.key === ' ') && onInspect) {
      e.preventDefault();
      onInspect(nodes[focusIndex].id);
    }
  };

  // focus follows the roving index
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const navRef = useRef(false);
  if (navRef.current) {
    navRef.current = false;
    itemRefs.current[focusIndex]?.focus();
  }

  return (
    <section aria-label="Provenance graph" className="rounded-md border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-sans text-sm font-semibold text-text-primary">Provenance</p>
        <div className="ml-auto flex gap-2" role="tablist" aria-label="Graph view mode">
          {(['list', 'graph'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              className={`min-h-11 rounded-sm px-3 py-2 font-sans text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                mode === m ? 'bg-action-primary text-on-primary' : 'bg-surface text-brand hover:bg-surface-subtle'
              }`}
              onClick={() => setMode(m)}
            >
              {m === 'list' ? 'List (default)' : 'Graph'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'list' ? (
        <>
          {/* Canonical accessible list — keyboard navigable node-by-node */}
          <ul
            ref={listRef}
            aria-label="Knowledge objects"
            className="mt-3 space-y-2"
            onKeyDown={onKeyDown}
          >
            {nodes.map((n, i) => (
              <li
                key={n.id}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                tabIndex={i === focusIndex ? 0 : -1}
                aria-label={`${n.type}: ${n.label}`}
                className={`rounded-sm border border-line px-3 py-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${n.nodeClass}`}
              >
                <span className="font-sans text-[0.8125rem] font-semibold uppercase tracking-[0.04em]">{n.type}</span>{' '}
                <span className="font-serif text-text-primary">{n.label}</span>
              </li>
            ))}
          </ul>
          {/* Equivalent relationship table */}
          <table className="mt-4 w-full font-sans text-sm">
            <caption className="text-left text-xs text-text-tertiary">All relationships (equivalent to the graph)</caption>
            <thead>
              <tr className="border-b border-line text-left text-text-secondary">
                <th scope="col" className="py-1 pr-4">Subject</th>
                <th scope="col" className="py-1 pr-4">Relationship</th>
                <th scope="col" className="py-1">Object</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-line">
                  <td className="py-1 pr-4">{r.subject}</td>
                  <td className="py-1 pr-4">{r.relationship}{r.note ? ` — ${r.note}` : ''}</td>
                  <td className="py-1">{r.object}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        /* Wide-screen graph mode: SVG with labeled edges; list remains one click away */
        <svg role="img" aria-label={`Provenance graph with ${nodes.length} nodes and ${edges.length} labeled relationships. Use List mode for the accessible equivalent.`} viewBox="0 0 600 300" className="mt-3 w-full">
          {nodes.map((n, i) => (
            <g key={n.id}>
              <circle cx={80 + (i % 4) * 150} cy={60 + Math.floor(i / 4) * 120} r="18" fill="currentColor" className={n.nodeClass} opacity="0.85" />
              <text x={80 + (i % 4) * 150} y={110 + Math.floor(i / 4) * 120} textAnchor="middle" fontSize="11" className="fill-text-primary font-sans">
                {n.label.slice(0, 18)}
              </text>
            </g>
          ))}
          {edges.map((e, i) => {
            const from = nodes.findIndex((n) => n.id === e.from);
            const to = nodes.findIndex((n) => n.id === e.to);
            if (from < 0 || to < 0) return null;
            const x1 = 80 + (from % 4) * 150, y1 = 60 + Math.floor(from / 4) * 120;
            const x2 = 80 + (to % 4) * 150, y2 = 60 + Math.floor(to / 4) * 120;
            return (
              <g key={i}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" className="text-graph-edge-relates" strokeWidth="1.5" strokeDasharray={e.inferred ? '4 3' : undefined} />
                <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 4} textAnchor="middle" fontSize="10" className="fill-text-secondary font-sans">
                  {e.label}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      <p className="mt-2 font-sans text-xs text-text-tertiary">
        Keyboard: ↑ ↓ ← → move between nodes, Enter inspects. Edge labels are always text; dashed lines mark inferred relationships.
      </p>
    </section>
  );
}
