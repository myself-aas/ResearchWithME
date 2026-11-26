import MetricMatrix from '@/components/library/MetricMatrix';
import PathwayMap from '@/components/library/PathwayMap';
import AssumptionSwitches from '@/components/library/AssumptionSwitches';
import SelfCheckQuiz from '@/components/library/SelfCheckQuiz';
import { PERSPECTIVE_MODE_COLUMNS } from '@/lib/post/perspective-api-review-before-you-moderate';
import { PERSPECTIVE_MODE_ROWS } from '@/lib/post/perspective-api-review-before-you-moderate';
import { PERSPECTIVE_PATHWAY_STAGES } from '@/lib/post/perspective-api-review-before-you-moderate';
import { PERSPECTIVE_ASSUMPTIONS } from '@/lib/post/perspective-api-review-before-you-moderate';
import { PERSPECTIVE_OUTCOMES } from '@/lib/post/perspective-api-review-before-you-moderate';
import { PERSPECTIVE_QUIZ } from '@/lib/post/perspective-api-review-before-you-moderate';

/**
 * Thin bindings for the Perspective review: post data, library interaction.
 */

export function PerspectiveModeMatrix() {
  return <MetricMatrix title="Three modes, three data placements" subtitle="Placement against its adoption concern — sortable." columns={PERSPECTIVE_MODE_COLUMNS} rows={PERSPECTIVE_MODE_ROWS} caption="Mode" />;
}

export function PerspectiveBoundaryPathway() {
  return <PathwayMap title="Decide the boundary before the chart" subtitle="Pick a mode, then the update path — the commitments accumulate." stages={PERSPECTIVE_PATHWAY_STAGES} costUnit="decisions owed" />;
}

export function PerspectiveAssumptionSwitches() {
  return <AssumptionSwitches assumptions={PERSPECTIVE_ASSUMPTIONS} outcomes={PERSPECTIVE_OUTCOMES} />;
}

export function PerspectiveQuiz() {
  return <SelfCheckQuiz title="Check the placement reading" questions={PERSPECTIVE_QUIZ} />;
}
