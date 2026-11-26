'use client';

import { useRef, useState } from 'react';
import FigureChrome, { PRIMARY_BUTTON, RANGE_CLASS, READOUT_CLASS } from './FigureChrome';
import {
  axisValue,
  clampNorm,
  evaluateOutput,
  feasibleGrid,
  formatValue,
  type TradeoffAxis,
  type TradeoffBudget,
  type TradeoffOutput,
} from '@/lib/figures/tradeoff';

/**
 * TradeoffPad — archetype `2d-parameter-drag`.
 *
 * The only two-dimensional direct-manipulation figure in the library: the
 * reader drags one point through a parameter plane and watches derived
 * outcomes recompute live. A budget field shades where the constraint holds.
 * The pad is keyboard-operable (arrow keys move the point in 0.05 steps) and
 * mirrored by two visible sliders, so the same state has three entrances.
 */
export default function TradeoffPad({
  xAxis,
  yAxis,
  outputs,
  budget,
  initialPoint = { x: 0.5, y: 0.5 },
}: {
  xAxis: TradeoffAxis;
  yAxis: TradeoffAxis;
  outputs: TradeoffOutput[];
  budget?: TradeoffBudget;
  initialPoint?: { x: number; y: number };
}) {
  const [point, setPoint] = useState({ x: clampNorm(initialPoint.x), y: clampNorm(initialPoint.y) });
  const stage = useRef<HTMLDivElement>(null);
  const FEASIBILITY_N = 16;
  const feasible = budget ? feasibleGrid(budget, FEASIBILITY_N) : null;

  function dragTo(clientX: number, clientY: number) {
    const rect = stage.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    setPoint({
      x: clampNorm((clientX - rect.left) / rect.width),
      y: clampNorm(1 - (clientY - rect.top) / rect.height),
    });
  }

  function nudge(dx: number, dy: number) {
    setPoint((current) => ({ x: clampNorm(current.x + dx), y: clampNorm(current.y + dy) }));
  }

  const readout = outputs
    .map((output) => `${output.label} ${formatValue(evaluateOutput(output, point.x, point.y))}${output.unit ? ` ${output.unit}` : ''}`)
    .join(' · ');

  return (
    <FigureChrome
      title="A trade-off you can drag, not just read about"
      subtitle="One point in a two-dimensional parameter space. Drag it, press arrow keys on the stage, or use the sliders — every outcome below recomputes from the same linear model."
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
        <div
          ref={stage}
          tabIndex={0}
          role="group"
          aria-label={`${xAxis.label} and ${yAxis.label} parameter pad. Arrow keys move the point.`}
          onKeyDown={(event) => {
            const step = event.shiftKey ? 0.1 : 0.05;
            if (event.key === 'ArrowLeft') nudge(-step, 0);
            else if (event.key === 'ArrowRight') nudge(step, 0);
            else if (event.key === 'ArrowUp') nudge(0, step);
            else if (event.key === 'ArrowDown') nudge(0, -step);
            else return;
            event.preventDefault();
          }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            dragTo(event.clientX, event.clientY);
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) dragTo(event.clientX, event.clientY);
          }}
          className="relative aspect-[4/3] flex-1 cursor-crosshair select-none overflow-hidden rounded-xl border border-line bg-canvas [touch-action:none] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {feasible && (
            <div
              className="absolute inset-0 grid"
              style={{ gridTemplateColumns: `repeat(${FEASIBILITY_N}, 1fr)` }}
              aria-hidden="true"
            >
              {feasible.flatMap((line, rowIndex) =>
                line.map((ok, colIndex) => (
                  <span key={`${rowIndex}-${colIndex}`} className={`${ok ? 'bg-brand/10' : 'bg-destructive/10'}`} />
                )),
              )}
            </div>
          )}
          <div
            aria-hidden="true"
            className="absolute inset-y-0 border-l border-dashed border-border-strong/50"
            style={{ left: `${point.x * 100}%` }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 border-t border-dashed border-border-strong/50"
            style={{ top: `${(1 - point.y) * 100}%` }}
          />
          <span
            aria-hidden="true"
            className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand ring-2 ring-canvas transition-[left,top] duration-150 ease-standard motion-reduce:transition-none"
            style={{ left: `${point.x * 100}%`, top: `${(1 - point.y) * 100}%` }}
          />
          <span className="absolute bottom-1.5 left-2 font-mono text-[0.6875rem] text-ink-secondary">
            {formatValue(axisValue(xAxis, 0))} {xAxis.unit}
          </span>
          <span className="absolute bottom-1.5 right-2 font-mono text-[0.6875rem] text-ink-secondary">
            {formatValue(axisValue(xAxis, 1))} {xAxis.unit}
          </span>
          <span className="absolute left-2 top-1.5 font-mono text-[0.6875rem] text-ink-secondary">
            {yAxis.label}: {formatValue(axisValue(yAxis, 1))}
          </span>
        </div>

        <div className="flex flex-col justify-center gap-3 sm:w-56">
          {outputs.map((output) => (
            <div key={output.label} className="rounded-xl border border-line bg-surface px-3.5 py-3">
              <p className="font-sans text-xs font-medium text-ink-secondary">{output.label}</p>
              <p className="mt-0.5 font-mono text-lg font-semibold text-ink">
                {formatValue(evaluateOutput(output, point.x, point.y))}
                {output.unit && <span className="ml-1 text-xs font-normal text-ink-secondary">{output.unit}</span>}
              </p>
            </div>
          ))}
          {budget && (
            <p className={`${READOUT_CLASS} rounded-xl border border-line bg-canvas px-3.5 py-2.5`}>
              {budget.label}: {formatValue(evaluateOutput({ label: '', base: budget.base ?? 0, xCoef: budget.xCoef, yCoef: budget.yCoef }, point.x, point.y))} / {formatValue(budget.max)}
              {evaluateOutput({ label: '', base: budget.base ?? 0, xCoef: budget.xCoef, yCoef: budget.yCoef }, point.x, point.y) <= budget.max
                ? ' — within budget'
                : ' — over budget'}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4">
        <label className="flex min-w-56 flex-1 flex-col gap-1.5 font-sans text-xs font-medium text-ink-secondary">
          {xAxis.label} — {formatValue(axisValue(xAxis, point.x))}{xAxis.unit ? ` ${xAxis.unit}` : ''}
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(point.x * 100)}
            onChange={(event) => setPoint((current) => ({ ...current, x: clampNorm(Number(event.target.value) / 100) }))}
            className={RANGE_CLASS}
            aria-label={xAxis.label}
          />
        </label>
        <label className="flex min-w-56 flex-1 flex-col gap-1.5 font-sans text-xs font-medium text-ink-secondary">
          {yAxis.label} — {formatValue(axisValue(yAxis, point.y))}{yAxis.unit ? ` ${yAxis.unit}` : ''}
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(point.y * 100)}
            onChange={(event) => setPoint((current) => ({ ...current, y: clampNorm(Number(event.target.value) / 100) }))}
            className={RANGE_CLASS}
            aria-label={yAxis.label}
          />
        </label>
        <button
          type="button"
          onClick={() => setPoint({ x: clampNorm(initialPoint.x), y: clampNorm(initialPoint.y) })}
          className={PRIMARY_BUTTON}
        >
          Reset point
        </button>
      </div>

      <p aria-live="polite" className={`${READOUT_CLASS} mt-4`}>
        {readout}
      </p>
    </FigureChrome>
  );
}
