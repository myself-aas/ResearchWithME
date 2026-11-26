import type { MatrixColumn, MatrixRow } from '../matrix';

/**
 * Fixture for the MetricMatrix demo on /lab: a neutral options matrix with
 * one numeric column (sortable) and two text columns.
 */
export const METRIC_MATRIX_FIXTURE = {
  title: 'Three options, ordered your way',
  subtitle: 'Activate a column heading to sort — ascending, descending, then back to the review\u2019s order.',
  caption: 'Option',
  columns: [
    { key: 'setup', label: 'Setup cost', numeric: true },
    { key: 'control', label: 'Control' },
    { key: 'risk', label: 'Main risk' },
  ] as MatrixColumn[],
  rows: [
    { label: 'Managed service', cells: { setup: 1, control: 'Low — vendor owns it', risk: 'Provider lock-in' } },
    { label: 'Self-hosted', cells: { setup: 3, control: 'High — you own it', risk: 'Operational load' } },
    { label: 'Hybrid', cells: { setup: 2, control: 'Medium — split', risk: 'Two surfaces to secure' } },
  ] as MatrixRow[],
};
