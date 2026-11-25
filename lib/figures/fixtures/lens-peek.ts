import { hashSeed, mulberry32 } from '../random';
import type { LensLayer } from '../lens';

/**
 * Fixture for the LensPeek demo on /lab: the same 12×8 field twice — a raw
 * surface and its gradient — so the lens reveals a derived layer in place.
 */
function surface(seedText: string, rows: number, cols: number, peak: number): number[][] {
  const random = mulberry32(hashSeed(seedText));
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) =>
      Math.round((peak * (1 + Math.sin((row + col) / 3)) / 2 + random() * 1.5) * 10) / 10,
    ),
  );
}

const RAW = surface('raw-surface', 8, 12, 8);
const GRADIENT = RAW.map((row, rowIndex) =>
  row.map((cell, col) => {
    const right = row[Math.min(col + 1, row.length - 1)];
    const down = RAW[Math.min(rowIndex + 1, RAW.length - 1)][col];
    return Math.round(Math.abs(right - cell) + Math.abs(down - cell) * 10) / 10;
  }),
);

export const LENS_PEEK_FIXTURE = {
  base: { label: 'Raw field', values: RAW, tone: 'ink' } as LensLayer,
  lens: { label: 'Gradient field', values: GRADIENT, tone: 'brand' } as LensLayer,
  radius: 2,
  initialPosition: { col: 5, row: 3 },
};
