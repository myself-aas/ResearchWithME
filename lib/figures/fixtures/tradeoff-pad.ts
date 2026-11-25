import type { TradeoffAxis, TradeoffBudget, TradeoffOutput } from '../tradeoff';

/**
 * Fixture for the TradeoffPad demo on /lab: a neutral engineering trade-off
 * (throughput vs latency against an energy budget) with linear outcomes.
 */
export const TRADEOFF_PAD_FIXTURE = {
  xAxis: { label: 'Batch size', low: 1, high: 64, unit: 'items' } as TradeoffAxis,
  yAxis: { label: 'Precision mode', low: 0, high: 1, unit: 'level' } as TradeoffAxis,
  initialPoint: { x: 0.35, y: 0.7 },
  outputs: [
    { label: 'Throughput', base: 40, xCoef: 520, yCoef: -140, unit: 'items/s' },
    { label: 'Accuracy', base: 61, xCoef: -4, yCoef: 31, unit: '%' },
  ] as TradeoffOutput[],
  budget: { label: 'Energy allowance', base: 8, xCoef: 26, yCoef: 18, max: 34 } as TradeoffBudget,
};
