'use client';

import { useState } from 'react';
import FigureChrome, { READOUT_CLASS } from './FigureChrome';
import { chosenOptions, clampChoice, initialChoices, routeCost, type PathwayStage } from '@/lib/figures/pathway';

/**
 * PathwayMap — archetype `route-choice-pathway`.
 *
 * Stages in sequence, some stages forks: the reader picks an option at each
 * fork and the chosen route lights through the map while its commitments
 * accumulate (services to operate, checks to pass). Where assumption
 * switches flip independent booleans, a pathway is *sequential* — each
 * choice is conditioned on the route that led there. SSR renders the first
 * option per fork chosen.
 */
export default function PathwayMap({
  title,
  subtitle,
  stages,
  costUnit,
}: {
  title: string;
  subtitle: string;
  stages: PathwayStage[];
  /** Unit the per-option costs accumulate in. */
  costUnit: string;
}) {
  const [choices, setChoices] = useState<Record<string, string>>(() => initialChoices(stages));
  const chosen = chosenOptions(stages, choices);
  const total = routeCost(stages, choices);
  const forkCount = stages.filter((stage) => stage.options?.length).length;

  return (
    <FigureChrome title={title} subtitle={subtitle}>
      <ol className="flex flex-col gap-3">
        {chosen.map(({ stage, option }, index) => (
          <li key={stage.id} className="relative">
            {index < chosen.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute left-[1.375rem] top-11 h-[calc(100%-1rem)] w-0.5 bg-brand/40"
              />
            )}
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-on-primary font-mono text-sm font-semibold"
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1 rounded-xl border border-line bg-canvas px-4 py-3">
                <p className="font-sans text-sm font-semibold text-ink">{stage.label}</p>
                {stage.note && (
                  <p className="mt-0.5 font-sans text-xs text-ink-secondary">{stage.note}</p>
                )}
                {stage.options?.length ? (
                  <div className="mt-2.5 flex flex-wrap gap-2" role="group" aria-label={`Choose at stage: ${stage.label}`}>
                    {stage.options.map((candidate) => {
                      const active = candidate.id === option?.id;
                      return (
                        <button
                          key={candidate.id}
                          type="button"
                          onClick={() =>
                            setChoices((current) => ({
                              ...current,
                              [stage.id]: clampChoice(stage, candidate.id),
                            }))
                          }
                          aria-pressed={active}
                          className={`inline-flex min-h-9 items-center rounded-full border px-3.5 py-1.5 font-sans text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                            active
                              ? 'border-brand bg-selection text-brand'
                              : 'border-line bg-surface text-ink-secondary hover:border-brand hover:text-ink'
                          }`}
                        >
                          {candidate.label}
                          {candidate.cost !== undefined && (
                            <span className="ml-1.5 font-mono text-[0.6875rem] opacity-80">
                              +{candidate.cost}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                {option?.detail && (
                  <p className="mt-2 font-sans text-xs leading-relaxed text-ink-secondary">
                    {option.detail}
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>

      <p aria-live="polite" className={`${READOUT_CLASS} mt-4`}>
        {forkCount} fork{forkCount === 1 ? '' : 's'} on this pathway — your route accumulates{' '}
        <strong className="text-ink">{total}</strong> {costUnit}.
      </p>
    </FigureChrome>
  );
}
