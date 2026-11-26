import type { FlowEdge, FlowNode } from '../flow';

/** Fixture for the FlowDiagram demo on /lab: a neutral request flow. */
export const FLOW_DIAGRAM_FIXTURE = {
  title: 'A request, block by block',
  subtitle: 'Step along the trace: the active block and the arrows you have already walked light up.',
  nodes: [
    { id: 'entry', label: 'Entry', x: 12, y: 50, kind: 'start', note: 'first hop; owns routing' },
    { id: 'auth', label: 'Authenticate', x: 40, y: 28, kind: 'step', note: 'checks the caller before work starts' },
    { id: 'queue', label: 'Queue?', x: 68, y: 50, kind: 'decision', note: 'queued or main-process routing' },
    { id: 'worker', label: 'Worker', x: 90, y: 74, kind: 'end', note: 'the work happens elsewhere' },
  ] as FlowNode[],
  edges: [
    { from: 'entry', to: 'auth', label: 'token' },
    { from: 'auth', to: 'queue' },
    { from: 'queue', to: 'worker', label: 'enqueue' },
  ] as FlowEdge[],
  path: ['entry', 'auth', 'queue', 'worker'],
};
