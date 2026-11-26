import LayerStack from '@/components/library/LayerStack';
import MetricMatrix from '@/components/library/MetricMatrix';
import AssumptionSwitches from '@/components/library/AssumptionSwitches';
import SelfCheckQuiz from '@/components/library/SelfCheckQuiz';
import {
  AIRFLOW_LAYERS,
  AIRFLOW_EVIDENCE_COLUMNS,
  AIRFLOW_EVIDENCE_ROWS,
  AIRFLOW_PILOT_ASSUMPTIONS,
  AIRFLOW_PILOT_OUTCOMES,
  AIRFLOW_QUIZ,
} from '@/lib/post/apache-airflow-review-should-you-use-it';

/**
 * Thin bindings for the Airflow teardown (Article 2): the library components
 * supply the interaction; this post supplies the reviewed facts. No logic
 * here — data in, component out.
 */

export function AirflowLayerStack() {
  return <LayerStack layers={AIRFLOW_LAYERS} caption="Airflow 3.4, component by component" />;
}

export function AirflowEvidenceMatrix() {
  return (
    <MetricMatrix
      title="What the review rests on"
      subtitle="Sort by evidence kind: documentation, source code, or things this review did not measure."
      columns={AIRFLOW_EVIDENCE_COLUMNS}
      rows={AIRFLOW_EVIDENCE_ROWS}
      caption="Finding"
    />
  );
}

export function AirflowPilotSwitches() {
  return (
    <AssumptionSwitches
      assumptions={AIRFLOW_PILOT_ASSUMPTIONS}
      outcomes={AIRFLOW_PILOT_OUTCOMES}
    />
  );
}

export function AirflowQuiz() {
  return <SelfCheckQuiz title="Check the review before you cite it" questions={AIRFLOW_QUIZ} />;
}
