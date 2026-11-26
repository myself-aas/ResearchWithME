import type { OrgNode } from '../tree';

/** Fixture for the OrgChart demo on /lab: a neutral module hierarchy. */
export const ORG_CHART_FIXTURE = {
  title: 'A system, structured',
  subtitle: 'Expand a node to disclose what sits under it; collapsed nodes keep their leaf count visible.',
  root: [
    {
      id: 'platform',
      label: 'Platform',
      role: 'everything the reader touches',
      count: 9,
      countUnit: 'units',
      children: [
        { id: 'surface', label: 'Surfaces', role: 'what the reader sees', children: [
          { id: 'web', label: 'Web', count: 4, countUnit: 'apps' },
          { id: 'mobile', label: 'Mobile', count: 2, countUnit: 'apps' },
        ] },
        { id: 'services', label: 'Services', role: 'what does the work', children: [
          { id: 'api', label: 'API', count: 2, countUnit: 'services' },
          { id: 'jobs', label: 'Background jobs', count: 1, countUnit: 'worker' },
        ] },
      ],
    },
  ] as OrgNode[],
};
