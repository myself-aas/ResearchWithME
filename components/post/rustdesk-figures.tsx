import FlowDiagram from '@/components/library/FlowDiagram';
import MetricMatrix from '@/components/library/MetricMatrix';
import AssumptionSwitches from '@/components/library/AssumptionSwitches';
import SelfCheckQuiz from '@/components/library/SelfCheckQuiz';
import { RUSTDESK_FLOW_NODES } from '@/lib/post/rustdesk-review-before-you-deploy';
import { RUSTDESK_FLOW_EDGES } from '@/lib/post/rustdesk-review-before-you-deploy';
import { RUSTDESK_BOUNDARY_COLUMNS } from '@/lib/post/rustdesk-review-before-you-deploy';
import { RUSTDESK_BOUNDARY_ROWS } from '@/lib/post/rustdesk-review-before-you-deploy';
import { RUSTDESK_AUDIT_ASSUMPTIONS } from '@/lib/post/rustdesk-review-before-you-deploy';
import { RUSTDESK_AUDIT_OUTCOMES } from '@/lib/post/rustdesk-review-before-you-deploy';
import { RUSTDESK_QUIZ } from '@/lib/post/rustdesk-review-before-you-deploy';

/**
 * Thin bindings for the RustDesk review: post data, library interaction.
 */

export function RustdeskConnectionFlow() {
  return <FlowDiagram title="The connection, block by block" subtitle="Walk the trace the essay inspected: discovery, relay, endpoint — each lit arrow a boundary." nodes={RUSTDESK_FLOW_NODES} edges={RUSTDESK_FLOW_EDGES} path={["client", "mediator", "relay", "endpoint"]} />;
}

export function RustdeskBoundaryMatrix() {
  return <MetricMatrix title="Four boundaries, two columns" subtitle="What the review inspected against what still needs your validation — sortable." columns={RUSTDESK_BOUNDARY_COLUMNS} rows={RUSTDESK_BOUNDARY_ROWS} caption="Boundary" />;
}

export function RustdeskAuditSwitches() {
  return <AssumptionSwitches assumptions={RUSTDESK_AUDIT_ASSUMPTIONS} outcomes={RUSTDESK_AUDIT_OUTCOMES} />;
}

export function RustdeskQuiz() {
  return <SelfCheckQuiz title="Check the trust reading" questions={RUSTDESK_QUIZ} />;
}
