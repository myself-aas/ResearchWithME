/**
 * WorkflowDiagram — a research lifecycle as an accessible vertical flow.
 *
 * Purpose: show the stages a piece of research passes through on the
 * platform, which capabilities serve each stage, and which are still planned.
 *
 * Why not Mermaid in the page: a Mermaid runtime is several hundred KB,
 * renders through innerHTML, and bakes colours into the SVG. This component is
 * the same diagram as semantic HTML — an ordered list of stages ending in an
 * outcome — so it is server-rendered, crawlable, theme-aware through tokens,
 * and keyboard navigable with no script. The Mermaid form of the same data
 * (`toMermaid`) is used in Markdown docs, where GitHub renders it for free.
 *
 * Anatomy: heading + summary, ordered stages (glyph · number · label ·
 * summary · capabilities disclosure), connector rail, outcome node.
 * Screen reader: "list, 4 items"; planned capabilities say "Planned" in text.
 * Token mapping: surface/border/text semantic tokens; link for disclosures.
 * Data: lib/workflows/research-workflows.ts. Tests: lib/__tests__/workflows.test.ts.
 */

import { cn } from '@/lib/utils';
import { Badge } from '@/components/primitives/Badge';
import type { ResearchWorkflow } from '@/lib/workflows/research-workflows';
import WorkflowStageItem, { type StageHeading } from './WorkflowStageItem';

export type WorkflowHeading = 'h2' | 'h3' | 'h4';

const NEXT_LEVEL: Record<WorkflowHeading, StageHeading> = { h2: 'h3', h3: 'h4', h4: 'h5' };

export interface WorkflowDiagramProps {
  workflow: ResearchWorkflow;
  /** Heading level for the diagram title; stages use the next level. Default h2. */
  heading?: WorkflowHeading;
  className?: string;
}

export default function WorkflowDiagram({ workflow, heading = 'h2', className }: WorkflowDiagramProps) {
  const Heading = heading;
  const OutcomeHeading = NEXT_LEVEL[heading];
  const titleId = `workflow-${workflow.id}-title`;

  return (
    <section aria-labelledby={titleId} data-workflow={workflow.id} className={cn('max-w-prose', className)}>
      <Heading id={titleId} className="font-serif text-2xl font-medium leading-tight text-text-primary text-balance">
        {workflow.title}
      </Heading>
      <p className="mt-2 font-sans text-sm text-text-secondary">{workflow.summary}</p>

      <ol className="mt-6" aria-label={`${workflow.title}: ${workflow.stages.length} stages and an outcome`}>
        {workflow.stages.map((stage, index) => (
          <WorkflowStageItem key={stage.id} stage={stage} index={index} heading={OutcomeHeading} />
        ))}

        <li className="grid grid-cols-[auto_1fr] gap-x-4">
          <span className="flex h-10 w-10 items-center justify-center" aria-hidden="true">
            <span
              className={cn(
                'h-3.5 w-3.5 rounded-full',
                workflow.outcome.status === 'planned'
                  ? 'border border-dashed border-border-strong'
                  : 'bg-text-primary',
              )}
            />
          </span>
          <div className="min-w-0 pt-2">
            <OutcomeHeading className="flex flex-wrap items-center gap-2 font-sans text-base font-semibold leading-snug text-text-primary">
              <span>
                <span className="sr-only">Outcome: </span>
                {workflow.outcome.label}
              </span>
              {workflow.outcome.status === 'planned' ? (
                <Badge variant="outline" size="sm">
                  Planned
                </Badge>
              ) : null}
            </OutcomeHeading>
            <p className="mt-1 font-sans text-sm text-text-secondary">{workflow.outcome.summary}</p>
          </div>
        </li>
      </ol>
    </section>
  );
}
