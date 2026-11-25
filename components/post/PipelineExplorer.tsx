'use client';

import type { ReactNode } from 'react';
import { ArrowDown, ArrowRight, Sparkles } from 'lucide-react';

export interface PipelineControlOption {
  value: string;
  label: string;
}

export interface PipelineControlGroup {
  id: string;
  label: string;
  ariaLabel: string;
  value: string;
  options: PipelineControlOption[];
  onChange: (value: string) => void;
  mono?: boolean;
}

export interface PipelineStage {
  step: string;
  title: string;
  ariaLabel: string;
  body: ReactNode;
  footer?: ReactNode;
}

export interface PipelineExplorerProps {
  ariaLabel: string;
  eyebrow?: string;
  description: string;
  controls: PipelineControlGroup[];
  stages: PipelineStage[];
  summary: string;
}

/**
 * Declarative multi-stage interactive explorer for MDX essays.
 * Renders segmented control groups, connected pipeline stages, and a live summary.
 */
export default function PipelineExplorer({
  ariaLabel,
  eyebrow = 'Interactive figure · change the inputs',
  description,
  controls,
  stages,
  summary,
}: PipelineExplorerProps) {
  return (
    <section
      aria-label={ariaLabel}
      className="my-10 overflow-hidden rounded-3xl border border-border bg-card shadow-raised"
    >
      <div className="border-b border-border bg-gradient-to-br from-muted/80 via-card to-card px-5 py-5 sm:px-7 sm:py-6">
        <p className="inline-flex items-center gap-2 font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-primary">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {eyebrow}
        </p>
        <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>

      {controls.length > 0 && (
        <div className="grid gap-4 border-b border-border px-5 py-4 sm:grid-cols-2 sm:px-7">
          {controls.map((group) => (
            <div key={group.id}>
              <p className="mb-2 font-mono text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
              <div
                role="group"
                aria-label={group.ariaLabel}
                className="inline-flex max-w-full flex-wrap rounded-xl border border-border bg-muted/70 p-1"
              >
                {group.options.map((option) => {
                  const active = group.value === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => group.onChange(option.value)}
                      className={`min-h-9 rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring ${
                        group.mono ? 'font-mono' : 'font-sans sm:px-4'
                      } ${
                        active
                          ? 'bg-card text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid items-stretch gap-3 bg-muted/30 p-4 sm:p-6 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)]">
        {stages.map((stage, index) => (
          <div key={stage.step} className="contents">
            <section
              aria-label={stage.ariaLabel}
              className="flex flex-col rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5"
            >
              <p className="font-mono text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {stage.step} · {stage.title}
              </p>
              <div className="mt-3 flex-1">{stage.body}</div>
              {stage.footer && <div className="mt-4">{stage.footer}</div>}
            </section>
            {index < stages.length - 1 && (
              <div className="flex items-center justify-center text-primary/70 md:px-0.5" aria-hidden="true">
                <ArrowDown className="h-4 w-4 md:hidden" />
                <ArrowRight className="hidden h-4 w-4 md:block" />
              </div>
            )}
          </div>
        ))}
      </div>

      <p aria-live="polite" className="border-t border-border px-5 py-4 font-sans text-xs leading-relaxed text-muted-foreground sm:px-7">
        {summary}
      </p>
    </section>
  );
}
