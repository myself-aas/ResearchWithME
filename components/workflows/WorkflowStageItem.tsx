'use client';

/**
 * WorkflowStageItem — one stage of a research lifecycle diagram.
 *
 * The stage's capabilities sit in a native `<details>` disclosure: keyboard
 * and screen-reader support come from the platform, and the list is in the
 * server HTML (crawlable, works without JavaScript). Opening it is the only
 * thing that animates — the stage glyph plays its §9 pattern once — so the
 * motion always answers a reader's action, never the page load.
 */

import { useState, type ComponentType } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/primitives/Badge';
import {
  AttentionMark,
  ConnectMark,
  SynthesizeMark,
  VerifyMark,
  type MicroInteractionProps,
} from '@/components/lottie/MicroInteractions';
import type { LottieAnimationName } from '@/lib/lottie/animations';
import type { WorkflowStage } from '@/lib/workflows/research-workflows';

const MARKS: Record<LottieAnimationName, ComponentType<MicroInteractionProps>> = {
  verify: VerifyMark,
  connect: ConnectMark,
  synthesize: SynthesizeMark,
  attention: AttentionMark,
};

export type StageHeading = 'h3' | 'h4' | 'h5';

export interface WorkflowStageItemProps {
  stage: WorkflowStage;
  index: number;
  heading: StageHeading;
}

export default function WorkflowStageItem({ stage, index, heading: Heading }: WorkflowStageItemProps) {
  const [plays, setPlays] = useState(0);
  const Mark = MARKS[stage.pattern];
  const plannedCount = stage.details.filter((detail) => detail.status === 'planned').length;

  return (
    <li className="relative grid grid-cols-[auto_1fr] gap-x-4">
      <div className="flex flex-col items-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border-strong bg-surface text-text-primary">
          <Mark size={20} autoplay={false} playKey={plays} />
        </span>
        <span data-workflow-connector aria-hidden="true" className="mt-1 w-px flex-1 bg-border-strong" />
      </div>

      <div className="min-w-0 pb-8">
        <p className="font-mono text-xs text-text-tertiary">Stage {index + 1}</p>
        <Heading className="mt-0.5 font-sans text-base font-semibold leading-snug text-text-primary">{stage.label}</Heading>
        <p className="mt-1 max-w-prose font-sans text-sm text-text-secondary">{stage.summary}</p>

        <details
          className="group/stage mt-2"
          onToggle={(event) => {
            if (event.currentTarget.open) setPlays((count) => count + 1);
          }}
        >
          <summary
            className={cn(
              'inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-sm font-sans text-sm font-medium text-link',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus [&::-webkit-details-marker]:hidden',
            )}
          >
            {stage.details.length} capabilities
            {plannedCount > 0 ? <span className="text-text-tertiary">· {plannedCount} planned</span> : null}
            <ChevronDown
              aria-hidden="true"
              className="h-4 w-4 transition-transform duration-200 ease-standard group-open/stage:rotate-180"
            />
          </summary>
          <ul className="mt-1 divide-y divide-line border-y border-line">
            {stage.details.map((detail) => (
              <li key={detail.id} className="flex items-baseline justify-between gap-3 py-2 font-sans text-sm">
                <span className={detail.status === 'planned' ? 'text-text-secondary' : 'text-text-primary'}>
                  {detail.label}
                </span>
                {detail.status === 'planned' ? (
                  <Badge variant="outline" size="sm">
                    Planned
                  </Badge>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      </div>
    </li>
  );
}
