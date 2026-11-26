import MetricMatrix from '@/components/library/MetricMatrix';
import HotspotAtlas from '@/components/library/HotspotAtlas';
import AssumptionSwitches from '@/components/library/AssumptionSwitches';
import SelfCheckQuiz from '@/components/library/SelfCheckQuiz';
import {POLARS_DECISION_COLUMNS, POLARS_DECISION_ROWS, POLARS_QUERY_PINS, POLARS_ASSUMPTIONS, POLARS_OUTCOMES, POLARS_QUIZ} from '@/lib/post/polars-review-before-you-switch';

/**
 * Thin bindings for the Polars teardown: post data, library interaction.
 */

export function PolarsDecisionMatrix() {
  return <MetricMatrix title="Four decisions, supported and unmeasured" subtitle="Sort by what the snapshot supports — then read the unmeasured column twice." columns={POLARS_DECISION_COLUMNS} rows={POLARS_DECISION_ROWS} caption="Decision" />;
}

export function PolarsQueryAtlas() {
  return <HotspotAtlas sceneLabel="Anatomy of a lazy query" points={POLARS_QUERY_PINS} />;
}

export function PolarsAssumptionSwitches() {
  return <AssumptionSwitches assumptions={POLARS_ASSUMPTIONS} outcomes={POLARS_OUTCOMES} />;
}

export function PolarsQuiz() {
  return <SelfCheckQuiz title="Check the plan, not the adjective" questions={POLARS_QUIZ} />;
}
