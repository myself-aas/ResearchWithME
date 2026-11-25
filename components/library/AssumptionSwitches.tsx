'use client';

import { useState } from 'react';
import FigureChrome, { PRIMARY_BUTTON, READOUT_CLASS } from './FigureChrome';
import { meterPercent, outcomeValue, verdict, type Assumption, type AssumptionOutcome } from '@/lib/figures/assumptions';

/**
 * AssumptionSwitches — archetype `toggle-assumption-inference`.
 *
 * Boolean switches re-derive every outcome from data: each outcome is a base
 * plus per-assumption deltas, so the reader can audit *which assumption is
 * worth what* instead of trusting a single headline number. The only figure
 * driven by discrete on/off reasoning; its meter encodes distance from the
 * worst achievable value, not a raw percentage.
 */
export default function AssumptionSwitches({
  assumptions,
  outcomes,
}: {
  assumptions: Assumption[];
  outcomes: AssumptionOutcome[];
}) {
  const [active, setActive] = useState<Set<string>>(() => new Set(assumptions.map((a) => a.id)));

  function toggle(id: string) {
    setActive((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <FigureChrome
      title="Flip the assumptions, watch the conclusion move"
      subtitle="Each switch adds or removes one assumption's contribution. The meters show distance from the worst achievable value — better can mean lower, and the readout says which."
    >
      <ul className="flex flex-col gap-2.5">
        {assumptions.map((assumption) => {
          const on = active.has(assumption.id);
          return (
            <li key={assumption.id}>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                onClick={() => toggle(assumption.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-line bg-canvas px-4 py-3 text-left transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <span
                  aria-hidden="true"
                  className={`relative h-6 w-10 shrink-0 rounded-full transition-colors duration-200 ease-standard motion-reduce:transition-none ${
                    on ? 'bg-brand' : 'bg-surface-subtle border border-line'
                  }`}
                >
                  <span
                    className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-canvas shadow-sm transition-[left] duration-200 ease-standard motion-reduce:transition-none ${
                      on ? 'left-[1.375rem]' : 'left-0.5'
                    }`}
                  />
                </span>
                <span>
                  <span className="block font-sans text-sm font-medium text-ink">{assumption.label}</span>
                  {assumption.note && (
                    <span className="mt-0.5 block font-sans text-xs text-ink-secondary">{assumption.note}</span>
                  )}
                </span>
                <span className={`ml-auto font-mono text-[0.6875rem] uppercase tracking-wider ${on ? 'text-brand' : 'text-ink-secondary'}`}>
                  {on ? 'On' : 'Off'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 flex flex-col gap-3">
        {outcomes.map((outcome) => {
          const value = outcomeValue(outcome, active);
          const meter = meterPercent(outcome, active);
          return (
            <div key={outcome.label} className="flex items-center gap-3">
              <span className="w-28 shrink-0 font-sans text-xs font-medium text-ink-secondary">{outcome.label}</span>
              <span className="relative h-4 flex-1 overflow-hidden rounded-full bg-surface-subtle">
                <span
                  className={`block h-full rounded-full transition-[width] duration-300 ease-standard motion-reduce:transition-none ${
                    outcome.betterWhen === 'higher' ? 'bg-brand' : 'bg-trust-emerging'
                  }`}
                  style={{ width: `${meter}%` }}
                />
              </span>
              <span className="w-28 shrink-0 text-right font-mono text-xs text-ink">
                {value}
                {outcome.unit ? ` ${outcome.unit}` : ''}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setActive(new Set(assumptions.map((a) => a.id)))}
          className={PRIMARY_BUTTON}
        >
          All assumptions on
        </button>
        <button
          type="button"
          onClick={() => setActive(new Set())}
          className={PRIMARY_BUTTON}
        >
          Strip them all
        </button>
      </div>

      <p aria-live="polite" className={`${READOUT_CLASS} mt-4`}>
        {verdict(outcomes, active)}
      </p>
    </FigureChrome>
  );
}
