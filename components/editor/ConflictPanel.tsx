/**
 * ConflictPanel — reme v3.1 §34 conflict recovery UI.
 *
 * Shows BOTH versions side by side (conflicts preserve both versions),
 * requires a rationale before resolving, and records author + timestamp via
 * the supplied onResolve callback. Never presents a merge as automatic.
 */
import { useState } from 'react';
import type { ConflictSide } from '@/lib/schemas/annotations';

export interface ConflictPanelProps {
  sides: [ConflictSide, ConflictSide];
  /** called with (selectedValues, rationale); resolution is recorded server-side */
  onResolve: (selected: Record<string, unknown>, rationale: string) => void;
}

export default function ConflictPanel({ sides, onResolve }: ConflictPanelProps) {
  const keys = Array.from(new Set([...Object.keys(sides[0].values), ...Object.keys(sides[1].values)]));
  const [selected, setSelected] = useState<Record<string, unknown>>({});
  const [selectedSides, setSelectedSides] = useState<Record<string, 0 | 1>>({});
  const [rationale, setRationale] = useState('');

  const pick = (key: string, side: 0 | 1) => {
    setSelected((s) => ({ ...s, [key]: sides[side].values[key] }));
    setSelectedSides((s) => ({ ...s, [key]: side }));
  };
  const canResolve = rationale.trim().length > 0 && keys.every((k) => k in selected);

  return (
    <section aria-label="Sync conflict" className="rounded-2xl border border-trust-uncertain bg-surface p-4 font-sans text-sm">
      <h3 className="font-semibold text-text-primary">Sync conflict — both versions preserved</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {sides.map((side) => (
          <div key={side.label} className="min-w-0 rounded-xl border border-line bg-surface-subtle p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
              {side.label} · {side.capturedAt}
            </p>
            <dl className="mt-2 space-y-1">
              {keys.map((k) => (
                <div key={k} className="flex items-start justify-between gap-2">
                  <dt className="text-text-secondary">{k}</dt>
                  <dd className="break-all text-right text-text-primary">{JSON.stringify(side.values[k] ?? null)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      <fieldset className="mt-3">
        <legend className="text-xs font-semibold text-text-secondary">Choose values</legend>
        {keys.map((k) => (
          <div key={k} className="mt-1 flex flex-wrap items-center gap-3">
            <span className="w-40 text-text-secondary">{k}</span>
            {([0, 1] as const).map((i) => (
              <label key={i} className="flex min-h-11 cursor-pointer items-center gap-1.5">
                <input
                  type="radio"
                  name={`conflict-${k}`}
                  className="h-4 w-4 accent-[var(--reme-action-primary)]"
                  checked={selectedSides[k] === i}
                  onChange={() => pick(k, i)}
                />
                {sides[i].label}
              </label>
            ))}
          </div>
        ))}
      </fieldset>
      <label className="mt-3 block">
        <span className="text-xs font-semibold text-text-secondary">Rationale (required)</span>
        <textarea
          className="mt-1 min-h-20 w-full rounded-xl border border-line bg-surface p-3 text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          required
        />
      </label>
      <button
        type="button"
        disabled={!canResolve}
        className="mt-3 min-h-11 rounded-xl bg-brand px-4 font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        onClick={() => onResolve(selected, rationale)}
      >
        Resolve conflict
      </button>
    </section>
  );
}
