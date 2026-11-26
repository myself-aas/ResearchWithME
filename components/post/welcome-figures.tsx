import HotspotAtlas from '@/components/library/HotspotAtlas';
import MetricMatrix from '@/components/library/MetricMatrix';
import BudgetSplit from '@/components/library/BudgetSplit';
import SelfCheckQuiz from '@/components/library/SelfCheckQuiz';
import {
  WELCOME_ANATOMY_PINS,
  WELCOME_GATES_COLUMNS,
  WELCOME_GATES_ROWS,
  WELCOME_WEIGHT_BUCKETS,
  WELCOME_WEIGHT_TOTALS,
  WELCOME_WEIGHT_SHARES,
  WELCOME_QUIZ,
} from '@/lib/post/welcome-to-the-new-researchwithme';

/** Thin bindings for the welcome post: site facts, library interaction. */

export function WelcomeAnatomyAtlas() {
  return (
    <HotspotAtlas
      sceneLabel="Anatomy of an essay on this site"
      points={WELCOME_ANATOMY_PINS}
    />
  );
}

export function WelcomeGatesMatrix() {
  return (
    <MetricMatrix
      title="The definition of done, as a table"
      subtitle="Every gate this site enforces in CI — sort by budget to see how tight the page-weight limits are."
      columns={WELCOME_GATES_COLUMNS}
      rows={WELCOME_GATES_ROWS}
      caption="Constraint"
    />
  );
}

export function WelcomeBudgetSplit() {
  return (
    <BudgetSplit
      title="Where the page-weight budget goes"
      subtitle="Drag the dividers: the 1 MB budget is fixed, and three buckets carry the site's real caps (§9). The split is illustrative; the caps are not."
      buckets={WELCOME_WEIGHT_BUCKETS}
      totals={WELCOME_WEIGHT_TOTALS}
      initialShares={WELCOME_WEIGHT_SHARES}
    />
  );
}

export function WelcomeQuiz() {
  return <SelfCheckQuiz title="Check how this site works" questions={WELCOME_QUIZ} />;
}
