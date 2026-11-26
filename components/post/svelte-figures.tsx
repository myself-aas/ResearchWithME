import LayerStack from '@/components/library/LayerStack';
import MetricMatrix from '@/components/library/MetricMatrix';
import AssumptionSwitches from '@/components/library/AssumptionSwitches';
import SelfCheckQuiz from '@/components/library/SelfCheckQuiz';
import {
  SVELTE_LAYERS,
  SVELTE_BOUNDARY_COLUMNS,
  SVELTE_BOUNDARY_ROWS,
  SVELTE_ADOPTION_ASSUMPTIONS,
  SVELTE_ADOPTION_OUTCOMES,
  SVELTE_QUIZ,
} from '@/lib/post/svelte-review-before-you-migrate';

/** Thin bindings for the Svelte teardown: post data, library interaction. */

export function SvelteLayerStack() {
  return <LayerStack layers={SVELTE_LAYERS} caption="The compiler pipeline, stage by stage" />;
}

export function SvelteBoundaryMatrix() {
  return (
    <MetricMatrix
      title="Four reactivity boundaries"
      subtitle="The essay's boundary table, sortable: activate a column to reorder the audit."
      columns={SVELTE_BOUNDARY_COLUMNS}
      rows={SVELTE_BOUNDARY_ROWS}
      caption="Boundary"
    />
  );
}

export function SvelteAdoptionSwitches() {
  return (
    <AssumptionSwitches
      assumptions={SVELTE_ADOPTION_ASSUMPTIONS}
      outcomes={SVELTE_ADOPTION_OUTCOMES}
    />
  );
}

export function SvelteQuiz() {
  return <SelfCheckQuiz title="Check yourself before the migration spike" questions={SVELTE_QUIZ} />;
}
