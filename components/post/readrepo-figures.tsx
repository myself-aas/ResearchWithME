import MetricMatrix from '@/components/library/MetricMatrix';
import OrgChart from '@/components/library/OrgChart';
import FlowDiagram from '@/components/library/FlowDiagram';
import SelfCheckQuiz from '@/components/library/SelfCheckQuiz';
import { READREPO_SIGNAL_COLUMNS } from '@/lib/post/read-a-repository-before-you-run-it';
import { READREPO_SIGNAL_ROWS } from '@/lib/post/read-a-repository-before-you-run-it';
import { READREPO_TREE } from '@/lib/post/read-a-repository-before-you-run-it';
import { READREPO_REQUEST_NODES } from '@/lib/post/read-a-repository-before-you-run-it';
import { READREPO_REQUEST_EDGES } from '@/lib/post/read-a-repository-before-you-run-it';
import { READREPO_REQUEST_PATH } from '@/lib/post/read-a-repository-before-you-run-it';
import { READREPO_QUIZ } from '@/lib/post/read-a-repository-before-you-run-it';

/**
 * Thin bindings for the read-a-repository method post: post data, library interaction.
 */

export function ReadRepoSignalsMatrix() {
  return (
    <MetricMatrix title="Three signals, in reading order" subtitle="Where to look against what it tells you — sortable." columns={READREPO_SIGNAL_COLUMNS} rows={READREPO_SIGNAL_ROWS} caption="Signal" />
  );
}

export function ReadRepoTree() {
  return (
    <OrgChart title="The repository as a structure of reads" subtitle="Expand a branch to the claim it carries — history, signals, one request, README last." root={READREPO_TREE} />
  );
}

export function ReadRepoRequestFlow() {
  return (
    <FlowDiagram title="One request, end to end" subtitle="Trace the real entry point down to what it writes and back up." nodes={READREPO_REQUEST_NODES} edges={READREPO_REQUEST_EDGES} path={READREPO_REQUEST_PATH} />
  );
}

export function ReadRepoQuiz() {
  return (
    <SelfCheckQuiz title="Check the method reading" questions={READREPO_QUIZ} />
  );
}
