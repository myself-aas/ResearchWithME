import type { ResearchNode } from './genui-schema';

/** Illustrative fixtures, not published research findings or benchmark claims. */
export const researchWidgets: ResearchNode[] = [
  { component: 'RemeStack', props: { gap: '3' }, children: [{ component: 'RemeEmptyState', props: { message: 'A vertically composed research response.' } }] },
  { component: 'RemeSplit', props: {}, children: [{ component: 'RemeMetricCard', props: { label: 'First observation', value: '12', detail: 'Illustrative fixture only.' } }, { component: 'RemeMetricCard', props: { label: 'Second observation', value: '18', detail: 'Illustrative fixture only.' } }] },
  { component: 'RemeMetricCard', props: { label: 'Sample count', value: '30', detail: 'Illustrative fixture only.' } },
  { component: 'RemeMetricTable', props: { caption: 'Illustrative comparison', columns: ['Observation', 'Score', 'Method'], rows: [['Baseline', '64', 'Held-out evaluation'], ['Candidate', '72', 'Held-out evaluation']], sourceNote: 'Synthetic numbers for layout verification; not experimental results.' } },
  { component: 'RemeBenchmarkChart', props: { title: 'Illustrative percentage scale', unit: '%', items: [{ label: 'Baseline', value: 64, sd: 0 }, { label: 'Candidate', value: 72, sd: 3 }] } },
  { component: 'RemeCitationCard', props: { title: 'Illustrative citation', authors: 'Example author', venueYear: 'Layout fixture · 2026', bibtex: '@misc{fixture, title={Illustrative citation}, year={2026}}', status: 'pending' } },
  { component: 'RemeStatusNotice', props: { state: 'pending', detail: 'Awaiting source verification. This is an illustrative state.' } },
  { component: 'RemeAuditChecklist', props: { heading: 'Before using a research claim', items: ['Open the primary source.', 'Check the evaluation protocol.', 'Check uncertainty and limitations.'] } },
  { component: 'RemeEmptyState', props: { message: 'No matching research entries.', actionHref: '/search', actionLabel: 'Search the archive' } },
];
