'use client';

import type { ComponentType } from 'react';
import { WandSparkles } from 'lucide-react';
import type { ToolCallMessagePartProps } from '@assistant-ui/react';
import { FIGURES, type FigureArg, type FigureDefinition, type FigureTool } from '@/lib/figures/registry';

/**
 * Generative figures for the assistant thread (AGENTS.md §18.10,
 * FIGURE_CONSTITUTION.md Article 3).
 *
 * The tool map is *derived* from the figure registry — one registry entry is
 * the only act of registration, and every figure (adopted or library) is
 * automatically renderable in-thread. When a reader asks a question
 * `routeFigure` recognises, the adapter emits a tool-call part first and
 * assistant-ui renders the matching component here with the tool's arguments
 * merged over its registry defaults. Deterministic end to end: keyword
 * routing, seeded visuals, no model call, no new network request. The
 * quoted-answer contract is untouched — the figure is a rendering of facts
 * already in the essays, not generated prose.
 */

type ToolCallProps = ToolCallMessagePartProps<Record<string, FigureArg>, { rendered: boolean }>;

/** Chrome around an in-thread figure: what it is, and where the essay lives. */
function FigureFrame({
  toolName,
  title,
  children,
}: {
  toolName: FigureTool;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="my-1 overflow-hidden rounded-xl border border-line bg-canvas">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2 font-mono text-[0.6875rem] uppercase tracking-wider text-ink-secondary">
        <WandSparkles className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
        <span>Interactive figure · {title}</span>
        <span className="ml-auto normal-case tracking-normal">{toolName.replace('show_', '').replaceAll('_', ' ')}</span>
      </div>
      <div className="px-1 [&>figure]:my-3 [&>figure]:border-0 [&>figure]:shadow-none">{children}</div>
    </div>
  );
}

/**
 * One factory instead of one hand-written wrapper per figure: the tool UI
 * merges the tool call's arguments over the registry defaults, so a call
 * with partial (or empty) arguments still renders a sensible figure
 * (Article 10).
 */
function makeFigureToolUI(definition: FigureDefinition): ComponentType<ToolCallProps> {
  function FigureToolUI(props: ToolCallProps) {
    const args = (props.args ?? {}) as Record<string, FigureArg>;
    return (
      <FigureFrame toolName={definition.toolName as FigureTool} title={definition.title}>
        <definition.component {...{ ...definition.defaults, ...args }} />
      </FigureFrame>
    );
  }
  return FigureToolUI;
}

/**
 * Registered at `MessagePrimitive.Content`'s `tools.by_name` so a tool-call
 * part renders its figure inline in the assistant message. Derived — never
 * hand-maintained (the constitution test enforces the derivation).
 */
export const generativeTools: {
  by_name: Partial<Record<FigureTool, ComponentType<ToolCallProps>>>;
} = {
  by_name: Object.fromEntries(
    FIGURES.map((figure) => [figure.toolName, makeFigureToolUI(figure)]),
  ) as Partial<Record<FigureTool, ComponentType<ToolCallProps>>>,
};
