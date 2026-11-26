import PathwayMap from '@/components/library/PathwayMap';
import MetricMatrix from '@/components/library/MetricMatrix';
import HotspotAtlas from '@/components/library/HotspotAtlas';
import SelfCheckQuiz from '@/components/library/SelfCheckQuiz';
import { WSTG_PATHWAY_STAGES } from '@/lib/post/owasp-wstg-review-how-to-test';
import { WSTG_FEATURE_COLUMNS } from '@/lib/post/owasp-wstg-review-how-to-test';
import { WSTG_FEATURE_ROWS } from '@/lib/post/owasp-wstg-review-how-to-test';
import { WSTG_REPORT_PINS } from '@/lib/post/owasp-wstg-review-how-to-test';
import { WSTG_QUIZ } from '@/lib/post/owasp-wstg-review-how-to-test';

/**
 * Thin bindings for the OWASP WSTG review: post data, library interaction.
 */

export function WstgTestingPathway() {
  return <PathwayMap title="A testing pathway with forks" subtitle="Pick honestly at each fork; the route accumulates what your choices cost in rigour." stages={WSTG_PATHWAY_STAGES} costUnit="rigour cost" />;
}

export function WstgFeatureMatrix() {
  return <MetricMatrix title="Practice against invalid inference" subtitle="What the repository supports, and the conclusion it does not — sortable." columns={WSTG_FEATURE_COLUMNS} rows={WSTG_FEATURE_ROWS} caption="Repository feature" />;
}

export function WstgReportAtlas() {
  return <HotspotAtlas sceneLabel="Anatomy of a test report" points={WSTG_REPORT_PINS} />;
}

export function WstgQuiz() {
  return <SelfCheckQuiz title="Check the method reading" questions={WSTG_QUIZ} />;
}
