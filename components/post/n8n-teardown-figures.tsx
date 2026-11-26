import MetricMatrix from '@/components/library/MetricMatrix';
import HotspotAtlas from '@/components/library/HotspotAtlas';
import AssumptionSwitches from '@/components/library/AssumptionSwitches';
import SelfCheckQuiz from '@/components/library/SelfCheckQuiz';
import {N8N_CONCERNS_COLUMNS, N8N_CONCERNS_ROWS, N8N_RUN_PINS, N8N_ADOPTION_ASSUMPTIONS, N8N_ADOPTION_OUTCOMES, N8N_QUIZ} from '@/lib/post/n8n-repo-teardown';

/**
 * Thin bindings for the n8n teardown: post data, library interaction.
 */

export function N8nConcernsMatrix() {
  return <MetricMatrix title="Four adoption concerns" subtitle="Static evidence against the question it cannot answer — sort either way." columns={N8N_CONCERNS_COLUMNS} rows={N8N_CONCERNS_ROWS} caption="Concern" />;
}

export function N8nRunAtlas() {
  return <HotspotAtlas sceneLabel="Anatomy of a workflow run" points={N8N_RUN_PINS} />;
}

export function N8nAdoptionSwitches() {
  return <AssumptionSwitches assumptions={N8N_ADOPTION_ASSUMPTIONS} outcomes={N8N_ADOPTION_OUTCOMES} />;
}

export function N8nQuiz() {
  return <SelfCheckQuiz title="Check the review before you adopt" questions={N8N_QUIZ} />;
}
