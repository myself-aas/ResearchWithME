'use client';

import { useState } from 'react';
import FigureChrome, { READOUT_CLASS, SECONDARY_BUTTON } from './FigureChrome';
import { cyclePoint, type HotspotPoint } from '@/lib/figures/hotspots';

/**
 * HotspotAtlas — archetype `pinned-hotspot-annotation`.
 *
 * Numbered pins anchored to fixed positions on a schematic scene; activating
 * one reveals its annotation card and keyboard arrows cycle the tour. The
 * only figure whose interaction is *anchored* — discrete points in space, not
 * a continuous parameter — and the only one that reads as a guided tour.
 */
export default function HotspotAtlas({
  sceneLabel,
  points,
}: {
  sceneLabel: string;
  points: HotspotPoint[];
}) {
  const [activeId, setActiveId] = useState<string | null>(points[0]?.id ?? null);
  const activeIndex = Math.max(points.findIndex((point) => point.id === activeId), 0);
  const active = points[activeIndex];

  function cycle(step: 1 | -1) {
    setActiveId(cyclePoint(points, activeId, step));
  }

  return (
    <FigureChrome
      title={sceneLabel}
      subtitle="Tap a numbered pin — or focus the scene and press arrow keys — to tour the annotations anchored to it."
    >
      <div
        role="group"
        aria-label={`${sceneLabel}: ${points.length} annotated hotspots. Arrow keys move between pins.`}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
            event.preventDefault();
            cycle(1);
          } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            event.preventDefault();
            cycle(-1);
          }
        }}
        className="relative aspect-[2/1] select-none overflow-hidden rounded-xl border border-line bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <div
          aria-hidden="true"
          className="absolute inset-6 rounded-lg border border-dashed border-border-strong/40"
        />
        {points.map((point, index) => {
          const isActive = point.id === activeId;
          return (
            <button
              key={point.id}
              type="button"
              onClick={() => setActiveId(point.id)}
              aria-pressed={isActive}
              aria-label={`Hotspot ${index + 1}: ${point.label}`}
              className={`absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border font-mono text-xs font-semibold transition-colors duration-150 ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                isActive
                  ? 'border-transparent bg-brand text-on-primary'
                  : 'border-line bg-canvas text-ink-secondary hover:border-brand hover:text-ink'
              }`}
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
            >
              {index + 1}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => cycle(-1)} className={SECONDARY_BUTTON} aria-label="Previous hotspot">
          ◀ Prev
        </button>
        <button type="button" onClick={() => cycle(1)} className={SECONDARY_BUTTON} aria-label="Next hotspot">
          Next ▶
        </button>
      </div>

      {active && (
        <div aria-live="polite" className="mt-4 rounded-xl border border-line bg-canvas px-4 py-3.5">
          <p className="font-mono text-[0.6875rem] font-semibold uppercase tracking-wider text-brand">
            {activeIndex + 1} / {points.length} — {active.label}
          </p>
          <p className="mt-1.5 font-sans text-sm leading-relaxed text-ink-secondary">{active.detail}</p>
        </div>
      )}
      <p className={`${READOUT_CLASS} mt-3`}>
        Pins hold their position in the scene; only the annotation changes.
      </p>
    </FigureChrome>
  );
}
