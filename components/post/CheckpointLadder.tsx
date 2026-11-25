'use client';

import { useState } from 'react';
import { ExternalLink, Gauge, Sparkles } from 'lucide-react';
import { CHECKPOINTS, type CheckpointFact } from '@/lib/post/prithvi';

/**
 * Checkpoint ladder for the six-checkpoint release.
 *
 * Selecting a checkpoint updates the payload card (parameters, metadata
 * embeddings, pretraining cost where the paper states one) and slides its
 * marker along the parameter-scale ladder — a compact visual for the essay's
 * point that the release is six checkpoints across four sizes, not a plain/TL
 * pair at every size, and that fine-tuning is one-GPU while pretraining was
 * an 80–240 A100 job.
 *
 * The renderer behind the assistant's `show_checkpoint_ladder`
 * generative-UI tool; the table lives in lib/post/prithvi.ts next to the
 * essay's own table so the two cannot drift.
 */
export default function CheckpointLadder({ initialCheckpoint = '600m-tl' }: { initialCheckpoint?: string }) {
  const initial = CHECKPOINTS.some((checkpoint) => checkpoint.id === initialCheckpoint)
    ? initialCheckpoint
    : '600m-tl';
  const [selectedId, setSelectedId] = useState(initial);
  const selected = CHECKPOINTS.find((checkpoint) => checkpoint.id === selectedId) as CheckpointFact;
  const maxParams = Math.max(...CHECKPOINTS.map((checkpoint) => checkpoint.params));
  const width = Math.max((selected.params / maxParams) * 100, 4);

  return (
    <figure className="my-8 overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="border-b border-line px-5 py-4">
        <figcaption className="font-sans text-sm font-semibold text-ink">
          Six checkpoints, four sizes, two that carry metadata
        </figcaption>
        <p className="mt-1 font-sans text-xs leading-relaxed text-ink-secondary">
          Pick a checkpoint from the Hub release; the ladder and payload card show what ships and
          what it cost to pretrain.
        </p>
      </div>

      <div className="px-5 py-5">
        <ul className="flex flex-wrap gap-2" role="listbox" aria-label="Released checkpoints">
          {CHECKPOINTS.map((checkpoint) => (
            <li key={checkpoint.id}>
              <button
                type="button"
                role="option"
                aria-selected={checkpoint.id === selectedId}
                onClick={() => setSelectedId(checkpoint.id)}
                className={`inline-flex min-h-11 items-center rounded-full border px-4 py-2 font-mono text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                  checkpoint.id === selectedId
                    ? 'border-brand bg-brand text-on-primary'
                    : 'border-line bg-canvas text-ink-secondary hover:border-brand hover:text-ink'
                }`}
              >
                {checkpoint.label}
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-6">
          <div
            className="relative h-3 rounded-full bg-surface-subtle"
            role="img"
            aria-label={`Parameter scale: ${selected.label} at ${selected.params} million parameters`}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-brand transition-[width] duration-300 ease-standard"
              style={{ width: `${width}%` }}
            />
            <span
              className="absolute -top-1 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-surface bg-brand shadow-raised transition-[left] duration-300 ease-standard"
              style={{ left: `${width}%` }}
              aria-hidden="true"
            />
          </div>
          <p className="mt-2 text-right font-mono text-[0.6875rem] text-ink-secondary">
            5M → 600M parameters · marker at {selected.params}M
          </p>
        </div>

        <div aria-live="polite" className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-canvas p-3.5">
            <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-ink-secondary">Parameters</p>
            <p className="mt-1 font-serif text-xl font-semibold text-ink">{selected.params}M</p>
          </div>
          <div className="rounded-xl border border-line bg-canvas p-3.5">
            <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-ink-secondary">Metadata embeddings</p>
            <p className={`mt-1 inline-flex items-center gap-1.5 font-sans text-sm font-semibold ${selected.tl ? 'text-brand' : 'text-ink-secondary'}`}>
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {selected.tl ? 'Temporal-location' : 'None — plain'}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-canvas p-3.5">
            <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-ink-secondary">
              Pretraining cost
            </p>
            <p className="mt-1 inline-flex items-center gap-1.5 font-sans text-sm font-semibold text-ink">
              <Gauge className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
              {selected.gpuHours
                ? `${(selected.gpuHours / 1000).toFixed(0)}k GPU-hours · ${selected.gpus}× A100`
                : 'Not reported'}
            </p>
          </div>
        </div>

        <p className="mt-4 font-sans text-sm leading-relaxed text-ink-secondary">{selected.use}</p>
        <a
          href={selected.href}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-2 inline-flex min-h-11 items-center gap-1.5 font-sans text-sm font-semibold text-brand underline underline-offset-4 hover:text-brand-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {selected.label} on Hugging Face
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
        <p className="mt-3 font-mono text-[0.6875rem] text-ink-secondary">
          Fine-tuning runs on one GPU for every size; pretraining the 300M and 600M models took 80
          and 240 A100s — the asymmetry the essay warns about.
        </p>
      </div>
    </figure>
  );
}
