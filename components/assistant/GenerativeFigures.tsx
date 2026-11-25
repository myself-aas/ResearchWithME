'use client';

import type { ComponentType } from 'react';
import { WandSparkles } from 'lucide-react';
import type { ToolCallMessagePartProps } from '@assistant-ui/react';
import MaskedPatchReconstructor from '@/components/post/MaskedPatchReconstructor';
import SeasonScrubber from '@/components/post/SeasonScrubber';
import CheckpointLadder from '@/components/post/CheckpointLadder';
import type { FigureTool } from '@/lib/assistant/retrieval';

/**
 * Generative figures for the assistant thread (AGENTS.md §18.10).
 *
 * When a reader asks a question the intent router recognises
 * (`routeFigure` in lib/assistant/retrieval.ts), the adapter emits a
 * tool-call part alongside the quoted answer, and assistant-ui renders the
 * matching component registered below — the *same* interactive component the
 * article renders, in the same surface, preconfigured through the tool's
 * arguments. Deterministic end to end: keyword routing, seeded visuals, no
 * model call, no new network request. The quoted-answer contract is
 * untouched — the figure is a rendering of facts already in the essays, not
 * generated prose.
 */

type ToolCallProps = ToolCallMessagePartProps<Record<string, string | number | boolean>, { rendered: boolean }>;

/** Chrome around an in-thread figure: what it is, and where the essay lives. */
function FigureFrame({
  toolName,
  children,
}: {
  toolName: FigureTool;
  children: React.ReactNode;
}) {
  return (
    <div className="my-1 overflow-hidden rounded-xl border border-line bg-canvas">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2 font-mono text-[0.6875rem] uppercase tracking-wider text-ink-secondary">
        <WandSparkles className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
        <span>Interactive figure · {toolName.replace('show_', '').replaceAll('_', ' ')}</span>
      </div>
      <div className="px-1 [&>figure]:my-3 [&>figure]:border-0 [&>figure]:shadow-none">
        {children}
      </div>
    </div>
  );
}

function SeasonScrubberTool(props: ToolCallProps) {
  const month = typeof props.args.initialMonth === 'number' ? props.args.initialMonth : 5;
  return (
    <FigureFrame toolName="show_season_scrubber">
      <SeasonScrubber initialMonth={month} />
    </FigureFrame>
  );
}

function MaskedPatchReconstructorTool(props: ToolCallProps) {
  const ratio = typeof props.args.initialRatio === 'number' ? props.args.initialRatio : 0.75;
  return (
    <FigureFrame toolName="show_masked_patch_reconstructor">
      <MaskedPatchReconstructor initialRatio={ratio} />
    </FigureFrame>
  );
}

function CheckpointLadderTool(props: ToolCallProps) {
  const checkpoint =
    typeof props.args.initialCheckpoint === 'string' ? props.args.initialCheckpoint : '600m-tl';
  return (
    <FigureFrame toolName="show_checkpoint_ladder">
      <CheckpointLadder initialCheckpoint={checkpoint} />
    </FigureFrame>
  );
}

/**
 * Registered at `MessagePrimitive.Content`'s `tools.by_name` so a tool-call
 * part renders its figure inline in the assistant message.
 */
export const generativeTools: {
  by_name: Partial<Record<FigureTool, ComponentType<ToolCallProps>>>;
} = {
  by_name: {
    show_season_scrubber: SeasonScrubberTool,
    show_masked_patch_reconstructor: MaskedPatchReconstructorTool,
    show_checkpoint_ladder: CheckpointLadderTool,
  },
};
