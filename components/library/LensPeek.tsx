'use client';

import { useRef, useState } from 'react';
import FigureChrome, { PRIMARY_BUTTON, READOUT_CLASS } from './FigureChrome';
import { clampPosition, lensCells, valueUnder, type LensLayer, type LensPosition } from '@/lib/figures/lens';
import { shadeFor } from '@/lib/figures/tones';

/**
 * LensPeek — archetype `hover-lens-peek`.
 *
 * A circular lens follows the pointer across one grid: outside it the base
 * layer shows, inside it a derived layer shows, and both values under the
 * centre are reported aloud. Where WipeCompare splits the stage globally,
 * the lens inspects locally — one continuous spatial hover with a keyboard
 * fallback (arrow keys step the lens cell by cell).
 */
export default function LensPeek({
  base,
  lens,
  radius = 2,
  initialPosition = { col: 0, row: 0 },
}: {
  base: LensLayer;
  lens: LensLayer;
  radius?: number;
  initialPosition?: LensPosition;
}) {
  const rows = base.values.length;
  const cols = base.values[0]?.length ?? 1;
  const [position, setPosition] = useState(() => clampPosition(initialPosition, cols, rows));
  const stage = useRef<HTMLDivElement>(null);
  const inside = lensCells(position, radius, cols, rows);
  const insideSet = new Set(inside.map(([row, col]) => `${row}-${col}`));
  const raw = valueUnder(base.values, position);
  const derived = valueUnder(lens.values, position);
  const baseMax = Math.max(...base.values.flat(), 1);
  const lensMax = Math.max(...lens.values.flat(), 1);

  function moveFromEvent(clientX: number, clientY: number) {
    const rect = stage.current?.getBoundingClientRect();
    if (!rect || cols === 0 || rows === 0) return;
    setPosition(
      clampPosition(
        {
          col: Math.floor(((clientX - rect.left) / rect.width) * cols),
          row: Math.floor(((clientY - rect.top) / rect.height) * rows),
        },
        cols,
        rows,
      ),
    );
  }

  return (
    <FigureChrome
      title={`A lens that turns “${base.label}” into “${lens.label}”`}
      subtitle="Move the pointer (or focus the field and press arrow keys): inside the lens the derived layer shows, outside it the raw field stays. Both values under the centre are read out."
    >
      <div
        ref={stage}
        tabIndex={0}
        onPointerMove={(event) => moveFromEvent(event.clientX, event.clientY)}
        onPointerDown={(event) => moveFromEvent(event.clientX, event.clientY)}
        onKeyDown={(event) => {
          const map: Record<string, LensPosition> = {
            ArrowLeft: { col: position.col - 1, row: position.row },
            ArrowRight: { col: position.col + 1, row: position.row },
            ArrowUp: { col: position.col, row: position.row - 1 },
            ArrowDown: { col: position.col, row: position.row + 1 },
          };
          const next = map[event.key];
          if (!next) return;
          event.preventDefault();
          setPosition(clampPosition(next, cols, rows));
        }}
        className="grid select-none gap-1 rounded-xl border border-line bg-surface-subtle p-3 [touch-action:pan-y] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        role="group"
        aria-label={`A ${rows} by ${cols} field with a ${radius}-cell-radius lens at column ${position.col}, row ${position.row}`}
      >
        {base.values.flatMap((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const key = `${rowIndex}-${colIndex}`;
            const inLens = insideSet.has(key);
            const isCentre = rowIndex === position.row && colIndex === position.col;
            const tone = inLens ? shadeFor(lens.values[rowIndex]?.[colIndex] ?? 0, lensMax, lens.tone) : shadeFor(cell, baseMax, base.tone);
            return (
              <span
                key={key}
                className={`block h-4 rounded-[3px] ${tone} ${
                  isCentre ? 'outline outline-2 outline-offset-1 outline-ink' : ''
                }`}
              />
            );
          }),
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setPosition(clampPosition(initialPosition, cols, rows))} className={PRIMARY_BUTTON}>
          Recentre lens
        </button>
        <span className={READOUT_CLASS} aria-live="polite">
          Under the lens: {lens.label} {derived ?? '—'} · {base.label} {raw ?? '—'}
        </span>
      </div>
    </FigureChrome>
  );
}
