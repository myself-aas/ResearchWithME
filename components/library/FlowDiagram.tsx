'use client';

import { useState } from 'react';
import FigureChrome, { PRIMARY_BUTTON, READOUT_CLASS, SECONDARY_BUTTON } from './FigureChrome';
import { clampStep, tracePath, traversedEdges, type FlowEdge, type FlowNode } from '@/lib/figures/flow';

/**
 * FlowDiagram — archetype `flow-diagram-trace`.
 *
 * A block/flow diagram of positioned nodes and edges: the reader walks a
 * designated trace one step at a time, the active node and the traversed
 * edges lit, each node's fact announced as it activates. Where the hotspot
 * atlas tours annotations on a static scene, this figure tours the *flow
 * itself* — order is carried by the arrows. SSR renders the full diagram
 * with the first node active.
 */
export default function FlowDiagram({
  title,
  subtitle,
  nodes,
  edges,
  path,
}: {
  title: string;
  subtitle: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  /** The trace order, as node ids. */
  path: string[];
}) {
  const traced = tracePath(path, nodes);
  const [step, setStep] = useState(0);
  const active = traced[clampStep(step, traced.length)];
  const activeNode = nodes.find((node) => node.id === active);
  const litEdges = traversedEdges(edges, traced, clampStep(step, traced.length));

  const kindClass = (kind: FlowNode['kind']) =>
    kind === 'start'
      ? 'border-brand bg-selection text-brand'
      : kind === 'end'
        ? 'border-border-strong bg-surface text-ink'
        : kind === 'decision'
          ? 'border-brand/50 bg-canvas text-ink [clip-path:polygon(12%_0,100%_0,88%_100%,0_100%)]'
          : 'border-line bg-surface text-ink';

  return (
    <FigureChrome title={title} subtitle={subtitle}>
      <div
        className="relative aspect-[3/2] overflow-hidden rounded-xl border border-line bg-surface-subtle"
        role="group"
        aria-label={`Flow diagram with ${nodes.length} blocks; step ${Math.min(step + 1, traced.length)} of ${traced.length} on the trace.`}
      >
        <svg className="absolute inset-0 h-full w-full" aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 100 100">
          {edges.map((edge) => {
            const from = nodes.find((node) => node.id === edge.from);
            const to = nodes.find((node) => node.id === edge.to);
            if (!from || !to) return null;
            const lit = litEdges.has(`${edge.from}->${edge.to}`);
            return (
              <g key={`${edge.from}-${edge.to}`}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={lit ? 'var(--color-brand)' : 'var(--color-border-strong)'}
                  strokeWidth={lit ? 0.7 : 0.35}
                  strokeDasharray={lit ? undefined : '1.5 1.5'}
                  opacity={lit ? 1 : 0.5}
                />
                {edge.label && (
                  <text
                    x={(from.x + to.x) / 2}
                    y={(from.y + to.y) / 2 - 1}
                    fontSize="2.6"
                    fill="var(--color-text-secondary)"
                    textAnchor="middle"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {nodes.map((node) => {
          const isActive = node.id === active;
          const isTraced = traced.slice(0, step + 1).includes(node.id);
          return (
            <div
              key={node.id}
              className={`absolute flex min-h-9 min-w-24 max-w-40 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border px-2.5 py-1.5 text-center font-sans text-[0.6875rem] font-semibold leading-tight transition-colors duration-200 ease-standard motion-reduce:transition-none ${
                isActive
                  ? 'border-brand bg-brand text-on-primary'
                  : isTraced
                    ? 'border-brand/60 bg-selection text-ink'
                    : kindClass(node.kind)
              }`}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              {node.label}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setStep((value) => clampStep(value - 1, traced.length))} className={SECONDARY_BUTTON}>
          ◀ Back
        </button>
        <button
          type="button"
          onClick={() => setStep((value) => clampStep(value + 1, traced.length))}
          disabled={step >= traced.length - 1}
          className={PRIMARY_BUTTON}
        >
          Next step ▶
        </button>
        <button type="button" onClick={() => setStep(0)} className={SECONDARY_BUTTON}>
          Restart
        </button>
      </div>

      <p aria-live="polite" className={`${READOUT_CLASS} mt-4`}>
        Step {Math.min(step + 1, traced.length)} of {traced.length} — {activeNode?.label}
        {activeNode?.note ? `: ${activeNode.note}` : '.'}
      </p>
    </FigureChrome>
  );
}
