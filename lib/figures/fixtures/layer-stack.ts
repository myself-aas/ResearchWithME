import type { StackLayer } from '../layers';

/**
 * Fixture for the LayerStack demo on /lab: a neutral four-layer service,
 * each layer carrying one kind of verified fact.
 */
export const LAYER_STACK_FIXTURE = {
  caption: 'A service, layer by layer',
  layers: [
    { id: 'edge', title: 'Edge', summary: 'Terminates connections and routes.', facts: ['First hop a request reaches.', 'Owns TLS and routing decisions.'] },
    { id: 'app', title: 'Application', summary: 'Holds the domain logic.', facts: ['Stateless handlers scale horizontally.', 'Talks to storage through interfaces.'] },
    { id: 'queue', title: 'Queue', summary: 'Buffers work between tiers.', facts: ['Absorbs bursts upstream of workers.'] },
    { id: 'store', title: 'Storage', summary: 'Persists the state.', facts: ['Single writer per record keeps the model simple.'] },
  ] as StackLayer[],
};
