import LayerStack from '@/components/library/LayerStack';
import MetricMatrix from '@/components/library/MetricMatrix';
import AssumptionSwitches from '@/components/library/AssumptionSwitches';
import SelfCheckQuiz from '@/components/library/SelfCheckQuiz';
import {NATS_LAYERS, NATS_SOURCE_COLUMNS, NATS_SOURCE_ROWS, NATS_GUARANTEE_ASSUMPTIONS, NATS_GUARANTEE_OUTCOMES, NATS_QUIZ} from '@/lib/post/nats-server-repo-teardown';

/**
 * Thin bindings for the NATS Server teardown: post data, library interaction.
 */

export function NatsLayerStack() {
  return <LayerStack layers={NATS_LAYERS} caption="JetStream controls, layer by layer" />;
}

export function NatsSourceMatrix() {
  return <MetricMatrix title="The server source map" subtitle="Real file counts from the pinned tree — sort to compare test weight." columns={NATS_SOURCE_COLUMNS} rows={NATS_SOURCE_ROWS} caption="Server root" />;
}

export function NatsGuaranteeSwitches() {
  return <AssumptionSwitches assumptions={NATS_GUARANTEE_ASSUMPTIONS} outcomes={NATS_GUARANTEE_OUTCOMES} />;
}

export function NatsQuiz() {
  return <SelfCheckQuiz title="Check the reliability reading" questions={NATS_QUIZ} />;
}
