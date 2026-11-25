'use client';

import { useRef, useState } from 'react';
import FigureChrome, { PRIMARY_BUTTON, RANGE_CLASS, READOUT_CLASS } from './FigureChrome';
import { clampSplit, gridMax, type WipeLayer } from '@/lib/figures/wipe';
import { shadeFor } from '@/lib/figures/tones';

/**
 * WipeCompare — archetype `drag-wipe-comparison`.
 *
 * The reader drags a vertical boundary across the stage to compare two full
 * fields of the same shape (before/after, two dates, two models). Direct
 * manipulation of a viewport split: nothing animates on its own, the drag
 * *is* the interaction. Keyboard users drive the same boundary through the
 * visible slider; both write the same state.
 *
 * Constitution: all facts arrive as props (two layers with equal shapes),
 * rendering is deterministic, and the initial state is server-rendered.
 */
export default function WipeCompare({
  layers,
  initialSplit = 50,
}: {
  layers: WipeLayer[];
  initialSplit?: number;
}) {
  const [split, setSplit] = useState(clampSplit(initialSplit));
  const stage = useRef<HTMLDivElement>(null);

  const [before, after] = layers;
  if (!before || !after) return null;
  const cols = before.values[0]?.length ?? 1;
  const beforeMax = gridMax(before.values);
  const afterMax = gridMax(after.values);

  function dragTo(clientX: number) {
    const rect = stage.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    setSplit(clampSplit(((clientX - rect.left) / rect.width) * 100));
  }

  return (
    <FigureChrome
      title={`Wipe between “${before.label}” and “${after.label}”`}
      subtitle={`Drag the boundary — or use the slider — to compare two full fields of the same ${before.values.length}×${cols} shape. Nothing animates on its own; the drag is the interaction.`}
    >
      <div
        ref={stage}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          dragTo(event.clientX);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) dragTo(event.clientX);
        }}
        className="relative select-none overflow-hidden rounded-xl border border-line bg-surface-subtle"
        role="img"
        aria-label={`${before.label} on the left of the boundary, ${after.label} on the right, boundary at ${split}%`}
      >
        <Grid layer={before} max={beforeMax} cols={cols} />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${split}%)` }}>
          <Grid layer={after} max={afterMax} cols={cols} />
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-y-0 w-0.5 bg-ink/70"
          style={{ left: `calc(${split}% - 1px)` }}
        />
        <span className="absolute left-2 top-2 rounded-full border border-line bg-canvas px-2.5 py-1 font-mono text-[0.6875rem] text-ink">
          {before.label}
        </span>
        <span className="absolute right-2 top-2 rounded-full border border-line bg-canvas px-2.5 py-1 font-mono text-[0.6875rem] text-ink">
          {after.label}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="flex min-w-56 flex-1 flex-col gap-1.5 font-sans text-xs font-medium text-ink-secondary">
          Reveal boundary — {split}%
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={split}
            onChange={(event) => setSplit(clampSplit(Number(event.target.value)))}
            className={RANGE_CLASS}
            aria-label={`Reveal boundary between ${before.label} and ${after.label}`}
          />
        </label>
        <button
          type="button"
          onClick={() => setSplit(50)}
          className={PRIMARY_BUTTON}
          aria-label="Reset the boundary to the middle"
        >
          Half &amp; half
        </button>
      </div>

      <p aria-live="polite" className={`${READOUT_CLASS} mt-4`}>
        Boundary at {split}% — {before.label} left, {after.label} right.
      </p>
    </FigureChrome>
  );
}

function Grid({ layer, max, cols }: { layer: WipeLayer; max: number; cols: number }) {
  return (
    <div
      className="grid gap-1 p-3"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      aria-hidden="true"
    >
      {layer.values.flatMap((row, rowIndex) =>
        row.map((cell, colIndex) => (
          <span
            key={`${rowIndex}-${colIndex}`}
            className={`block h-4 rounded-[3px] ${shadeFor(cell, max, layer.tone)}`}
          />
        )),
      )}
    </div>
  );
}
