import type { HotspotPoint } from '../hotspots';

/**
 * Fixture for the HotspotAtlas demo on /lab: annotations pinned onto a
 * schematic panel, teaching the reader how to read a diagnostic figure.
 */
export const HOTSPOT_ATLAS_FIXTURE = {
  sceneLabel: 'Anatomy of a diagnostic panel',
  points: [
    {
      id: 'axes',
      label: 'Axes and units',
      detail: 'Every panel states its units on both axes; a chart without units is decoration, not evidence.',
      x: 12,
      y: 18,
    },
    {
      id: 'trend',
      label: 'The trend line',
      detail: 'The heavy line is the fitted trend; the band around it is the interval, not error bars on the points.',
      x: 44,
      y: 34,
    },
    {
      id: 'points',
      label: 'Observations',
      detail: 'Each dot is one measurement. Outliers are kept visible — hiding them is a claim, not a style.',
      x: 70,
      y: 62,
    },
    {
      id: 'stamp',
      label: 'Provenance stamp',
      detail: 'The bottom-right stamp links the panel to the dataset snapshot it was drawn from.',
      x: 88,
      y: 86,
    },
  ] as HotspotPoint[],
};
