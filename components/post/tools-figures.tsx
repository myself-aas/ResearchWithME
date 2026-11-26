import LayerStack from '@/components/library/LayerStack';
import FlowDiagram from '@/components/library/FlowDiagram';
import OrgChart from '@/components/library/OrgChart';
import SelfCheckQuiz from '@/components/library/SelfCheckQuiz';
import { TOOLS_LIST_LAYERS } from '@/lib/post/tooling-notes-under-construction';
import { TOOLS_WORKFLOW_NODES } from '@/lib/post/tooling-notes-under-construction';
import { TOOLS_WORKFLOW_EDGES } from '@/lib/post/tooling-notes-under-construction';
import { TOOLS_WORKFLOW_PATH } from '@/lib/post/tooling-notes-under-construction';
import { TOOLS_DRAFT_TREE } from '@/lib/post/tooling-notes-under-construction';
import { TOOLS_QUIZ } from '@/lib/post/tooling-notes-under-construction';

/**
 * Thin bindings for the tooling-notes draft: post data, library interaction.
 */

export function ToolsListStack() {
  return (
    <LayerStack layers={TOOLS_LIST_LAYERS} caption="The list so far, tool by tool" />
  );
}

export function ToolsWorkflowFlow() {
  return (
    <FlowDiagram title="The workflow the tools serve" subtitle="From picking a read to publishing the notes — each block carries its tool." nodes={TOOLS_WORKFLOW_NODES} edges={TOOLS_WORKFLOW_EDGES} path={TOOLS_WORKFLOW_PATH} />
  );
}

export function ToolsDraftTree() {
  return (
    <OrgChart title="This draft, as a structure" subtitle="Written and still-to-write, honestly separated — expand the honest half." root={TOOLS_DRAFT_TREE} />
  );
}

export function ToolsQuiz() {
  return (
    <SelfCheckQuiz title="Check the tooling reading" questions={TOOLS_QUIZ} />
  );
}
