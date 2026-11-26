import LayerStack from '@/components/library/LayerStack';
import MetricMatrix from '@/components/library/MetricMatrix';
import AssumptionSwitches from '@/components/library/AssumptionSwitches';
import SelfCheckQuiz from '@/components/library/SelfCheckQuiz';
import {POSTHOG_STACK_LAYERS, POSTHOG_DECISION_COLUMNS, POSTHOG_DECISION_ROWS, POSTHOG_ASSUMPTIONS, POSTHOG_OUTCOMES, POSTHOG_QUIZ} from '@/lib/post/posthog-repo-teardown';

/**
 * Thin bindings for the PostHog teardown: post data, library interaction.
 */

export function PosthogStackLayers() {
  return <LayerStack layers={POSTHOG_STACK_LAYERS} caption="The hobby stack, service by service" />;
}

export function PosthogDecisionMatrix() {
  return <MetricMatrix title="Four decisions with follow-ups" subtitle="Evidence at each pin, and the follow-up it demands — sortable." columns={POSTHOG_DECISION_COLUMNS} rows={POSTHOG_DECISION_ROWS} caption="Decision" />;
}

export function PosthogAssumptionSwitches() {
  return <AssumptionSwitches assumptions={POSTHOG_ASSUMPTIONS} outcomes={POSTHOG_OUTCOMES} />;
}

export function PosthogQuiz() {
  return <SelfCheckQuiz title="Check the parity claim" questions={POSTHOG_QUIZ} />;
}
