import type { BudgetBucket, BudgetTotals } from '../budget';

/**
 * Fixture for the BudgetSplit demo on /lab: a neutral 1 MB page-weight
 * budget with two real caps, split four ways.
 */
export const BUDGET_SPLIT_FIXTURE = {
  title: 'A page-weight budget, split four ways',
  subtitle: 'Drag the dividers — the total is fixed, and two buckets carry real caps that clamp your split.',
  totals: { value: 1024, unit: 'KB' } as BudgetTotals,
  buckets: [
    { id: 'html', label: 'HTML', max: 200, unit: 'KB' },
    { id: 'js', label: 'JavaScript', max: 100, unit: 'KB' },
    { id: 'css', label: 'CSS', max: 50, unit: 'KB' },
    { id: 'images', label: 'Images' },
  ] as BudgetBucket[],
  initialShares: [25, 25, 25, 25],
};
