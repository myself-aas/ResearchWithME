import MetricMatrix from '@/components/library/MetricMatrix';
import AssumptionSwitches from '@/components/library/AssumptionSwitches';
import HotspotAtlas from '@/components/library/HotspotAtlas';
import SelfCheckQuiz from '@/components/library/SelfCheckQuiz';
import {
  PVALUE_MISREADING_COLUMNS,
  PVALUE_MISREADING_ROWS,
  PVALUE_ASSUMPTIONS,
  PVALUE_OUTCOMES,
  PVALUE_RESULTS_PINS,
  PVALUE_QUIZ,
} from '@/lib/post/what-a-p-value-does-not-tell-you';

/** Thin bindings for the p-value essay: post data, library interaction. */

export function PValueMisreadingMatrix() {
  return (
    <MetricMatrix
      title="The four misreadings, side by side"
      subtitle="Sort by error type — the taxonomy survives peer review better than the claims do."
      columns={PVALUE_MISREADING_COLUMNS}
      rows={PVALUE_MISREADING_ROWS}
      caption="What people write"
    />
  );
}

export function PValueAssumptionSwitches() {
  return (
    <AssumptionSwitches
      assumptions={PVALUE_ASSUMPTIONS}
      outcomes={PVALUE_OUTCOMES}
    />
  );
}

export function PValueResultsAtlas() {
  return (
    <HotspotAtlas
      sceneLabel="Anatomy of a results paragraph"
      points={PVALUE_RESULTS_PINS}
    />
  );
}

export function PValueQuiz() {
  return <SelfCheckQuiz title="Check your own reading" questions={PVALUE_QUIZ} />;
}
