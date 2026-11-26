import OrgChart from '@/components/library/OrgChart';
import MetricMatrix from '@/components/library/MetricMatrix';
import AssumptionSwitches from '@/components/library/AssumptionSwitches';
import SelfCheckQuiz from '@/components/library/SelfCheckQuiz';
import { SUPERSET_PLATFORM } from '@/lib/post/apache-superset-review-before-you-self-host';
import { SUPERSET_ASSET_COLUMNS } from '@/lib/post/apache-superset-review-before-you-self-host';
import { SUPERSET_ASSET_ROWS } from '@/lib/post/apache-superset-review-before-you-self-host';
import { SUPERSET_ASSUMPTIONS } from '@/lib/post/apache-superset-review-before-you-self-host';
import { SUPERSET_OUTCOMES } from '@/lib/post/apache-superset-review-before-you-self-host';
import { SUPERSET_QUIZ } from '@/lib/post/apache-superset-review-before-you-self-host';

/**
 * Thin bindings for the Apache Superset review: post data, library interaction.
 */

export function SupersetPlatformChart() {
  return <OrgChart title="The platform you would own" subtitle="Superset plus the services its responsibilities sit on — expand a node to its evaluation question." root={SUPERSET_PLATFORM} />;
}

export function SupersetAssetMatrix() {
  return <MetricMatrix title="Four assets, four questions" subtitle="Source-described responsibility against the evaluation question — sortable." columns={SUPERSET_ASSET_COLUMNS} rows={SUPERSET_ASSET_ROWS} caption="Asset or function" />;
}

export function SupersetAssumptionSwitches() {
  return <AssumptionSwitches assumptions={SUPERSET_ASSUMPTIONS} outcomes={SUPERSET_OUTCOMES} />;
}

export function SupersetQuiz() {
  return <SelfCheckQuiz title="Check the self-hosting reading" questions={SUPERSET_QUIZ} />;
}
