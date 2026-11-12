/**
 * WorkflowDisclosure — a research lifecycle diagram behind a native
 * disclosure, for embedding on task pages.
 *
 * The diagram explains the page; it is not the page's task. So it is closed
 * by default, sits after the primary content, and uses `<details>`: no
 * JavaScript, keyboard and screen-reader support from the platform, and the
 * full diagram stays in the server HTML for crawlers and no-JS readers.
 *
 * Token mapping: house eyebrow for the summary, hairline rule above.
 */

import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ResearchWorkflow } from '@/lib/workflows/research-workflows';
import WorkflowDiagram, { type WorkflowHeading } from './WorkflowDiagram';

export interface WorkflowDisclosureProps {
  workflow: ResearchWorkflow;
  /** Summary text. Defaults to "How this works: <workflow title>". */
  summary?: string;
  /** Heading level for the diagram title inside. Default h3. */
  heading?: WorkflowHeading;
  className?: string;
}

export default function WorkflowDisclosure({ workflow, summary, heading = 'h3', className }: WorkflowDisclosureProps) {
  return (
    <details data-workflow-disclosure={workflow.id} className={cn('group/disclosure', className)}>
      <summary
        className={cn(
          'inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-sm',
          'font-mono text-xs font-semibold uppercase tracking-wider text-ink',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus [&::-webkit-details-marker]:hidden',
        )}
      >
        <span>{summary ?? `How this works: ${workflow.title}`}</span>
        <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 transition-transform duration-200 ease-standard group-open/disclosure:rotate-180" />
      </summary>
      <WorkflowDiagram workflow={workflow} heading={heading} className="mt-4" />
    </details>
  );
}
