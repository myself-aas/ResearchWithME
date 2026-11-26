'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import FigureChrome, { READOUT_CLASS } from './FigureChrome';
import { clampOpen, nextLayer, type StackLayer } from '@/lib/figures/layers';

/**
 * LayerStack — archetype `accordion-layer-stack`.
 *
 * An expandable stack of architecture layers: the reader opens one layer at
 * a time and reads the verified facts inside it. Where the checkpoint ladder
 * moves a marker between siblings, this figure *discloses* depth — the
 * stack's order carries the architecture's structure, and opening a layer
 * never changes the others. SSR renders the first layer open.
 */
export default function LayerStack({
  layers,
  caption,
}: {
  layers: StackLayer[];
  caption?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(() => clampOpen(layers[0]?.id ?? null, layers));
  const openIndex = layers.findIndex((layer) => layer.id === openId);
  const open = layers[openIndex];

  return (
    <FigureChrome
      title={caption ?? 'The stack, layer by layer'}
      subtitle="Open one layer at a time — the order is the architecture; the facts inside are the reviewed evidence."
    >
      <ul className="flex flex-col gap-2">
        {layers.map((layer, index) => {
          const isOpen = layer.id === openId;
          const panelId = `layer-panel-${layer.id}`;
          return (
            <li key={layer.id} className="rounded-xl border border-line bg-canvas">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenId(isOpen ? null : layer.id)}
                className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[0.6875rem] font-semibold ${
                    isOpen ? 'bg-brand text-on-primary' : 'border border-line bg-surface text-ink-secondary'
                  }`}
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-sans text-sm font-semibold text-ink">{layer.title}</span>
                  <span className="block truncate font-sans text-xs text-ink-secondary">{layer.summary}</span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-ink-secondary transition-transform duration-200 ease-standard motion-reduce:transition-none ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>
              {isOpen && (
                <div id={panelId} className="border-t border-line px-4 py-3" aria-live="polite">
                  <ul className="flex flex-col gap-1.5">
                    {layer.facts.map((fact) => (
                      <li key={fact} className="flex gap-2 font-sans text-sm leading-relaxed text-ink-secondary">
                        <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                        {fact}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p aria-live="polite" className={`${READOUT_CLASS} mt-4`}>
        {open
          ? `Layer ${openIndex + 1} of ${layers.length}: ${open.title} — ${open.facts.length} verified facts.`
          : 'Nothing open; tap a layer to read its facts.'}
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setOpenId(nextLayer(layers, openId, -1))}
          className="inline-flex min-h-11 items-center rounded-full border border-line bg-canvas px-3.5 py-2.5 font-sans text-sm font-medium text-ink-secondary transition-colors hover:border-brand hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          ◀ Previous layer
        </button>
        <button
          type="button"
          onClick={() => setOpenId(nextLayer(layers, openId, 1))}
          className="inline-flex min-h-11 items-center rounded-full border border-line bg-canvas px-3.5 py-2.5 font-sans text-sm font-medium text-ink-secondary transition-colors hover:border-brand hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Next layer ▶
        </button>
      </div>
    </FigureChrome>
  );
}
