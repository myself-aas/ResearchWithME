import MetricMatrix from '@/components/library/MetricMatrix';
import PathwayMap from '@/components/library/PathwayMap';
import AssumptionSwitches from '@/components/library/AssumptionSwitches';
import SelfCheckQuiz from '@/components/library/SelfCheckQuiz';
import { BENCH_RESULT_COLUMNS } from '@/lib/post/reproducing-a-benchmark-that-did-not-survive';
import { BENCH_RESULT_ROWS } from '@/lib/post/reproducing-a-benchmark-that-did-not-survive';
import { BENCH_GAP_STAGES } from '@/lib/post/reproducing-a-benchmark-that-did-not-survive';
import { BENCH_CHECKLIST_ASSUMPTIONS } from '@/lib/post/reproducing-a-benchmark-that-did-not-survive';
import { BENCH_CHECKLIST_OUTCOMES } from '@/lib/post/reproducing-a-benchmark-that-did-not-survive';
import { BENCH_QUIZ } from '@/lib/post/reproducing-a-benchmark-that-did-not-survive';

/**
 * Thin bindings for the benchmark-reproduction post: post data, library interaction.
 */

export function BenchResultsMatrix() {
  return (
    <MetricMatrix title="Illustrative values, not measured results" subtitle="Unverified teaching fixture: sorting these ratios does not establish a real benchmark reproduction." columns={BENCH_RESULT_COLUMNS} rows={BENCH_RESULT_ROWS} caption="Illustrative scenario" />
  );
}

export function BenchGapPathway() {
  return (
    <PathwayMap title="Where the gap comes from" subtitle="Hypothetical measurement choices; the score is a teaching aid, not an observed risk probability." stages={BENCH_GAP_STAGES} costUnit="reproducibility debt" />
  );
}

export function BenchChecklistSwitches() {
  return (
    <AssumptionSwitches assumptions={BENCH_CHECKLIST_ASSUMPTIONS} outcomes={BENCH_CHECKLIST_OUTCOMES} />
  );
}

export function BenchQuiz() {
  return (
    <SelfCheckQuiz title="Check the hypothetical benchmark reading" questions={BENCH_QUIZ} />
  );
}
