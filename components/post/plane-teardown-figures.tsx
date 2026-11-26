import LayerStack from '@/components/library/LayerStack';
import MetricMatrix from '@/components/library/MetricMatrix';
import AssumptionSwitches from '@/components/library/AssumptionSwitches';
import SelfCheckQuiz from '@/components/library/SelfCheckQuiz';
import {PLANE_STACK_LAYERS, PLANE_DECISION_COLUMNS, PLANE_DECISION_ROWS, PLANE_MIGRATION_ASSUMPTIONS, PLANE_MIGRATION_OUTCOMES, PLANE_QUIZ} from '@/lib/post/plane-repo-teardown';

/**
 * Thin bindings for the Plane teardown: post data, library interaction.
 */

export function PlaneStackLayers() {
  return <LayerStack layers={PLANE_STACK_LAYERS} caption="The Compose responsibilities, layer by layer" />;
}

export function PlaneDecisionMatrix() {
  return <MetricMatrix title="Four decisions, four acceptance criteria" subtitle="Snapshot evidence against the criterion you must define — sortable." columns={PLANE_DECISION_COLUMNS} rows={PLANE_DECISION_ROWS} caption="Decision" />;
}

export function PlaneMigrationSwitches() {
  return <AssumptionSwitches assumptions={PLANE_MIGRATION_ASSUMPTIONS} outcomes={PLANE_MIGRATION_OUTCOMES} />;
}

export function PlaneQuiz() {
  return <SelfCheckQuiz title="Check the migration reading" questions={PLANE_QUIZ} />;
}
