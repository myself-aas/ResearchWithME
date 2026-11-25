/**
 * Pure logic for the LensPeek figure (archetype: hover-lens-peek).
 * The lens is a circular region of interest over a grid: outside it the base
 * layer shows, inside it the lens layer shows, and both values under the
 * centre are reported so the peek is legible without pointer precision.
 */

export type LensLayer = {
  label: string;
  values: number[][];
  tone: 'brand' | 'emerging' | 'insight' | 'ink';
}

export type LensPosition = {
  col: number;
  row: number;
}

export function clampPosition(position: LensPosition, cols: number, rows: number): LensPosition {
  const clamp = (value: number, max: number) =>
    Number.isFinite(value) ? Math.min(Math.max(Math.round(value), 0), Math.max(max - 1, 0)) : 0;
  return { col: clamp(position.col, cols), row: clamp(position.row, rows) };
}

/** Grid indices inside the lens radius, as [row, col] pairs. */
export function lensCells(
  position: LensPosition,
  radius: number,
  cols: number,
  rows: number,
): Array<[number, number]> {
  const cells: Array<[number, number]> = [];
  const r2 = radius * radius;
  for (let row = position.row - radius; row <= position.row + radius; row += 1) {
    for (let col = position.col - radius; col <= position.col + radius; col += 1) {
      const dRow = row - position.row;
      const dCol = col - position.col;
      if (dRow * dRow + dCol * dCol <= r2 && row >= 0 && row < rows && col >= 0 && col < cols) {
        cells.push([row, col]);
      }
    }
  }
  return cells;
}

/** The value at the lens centre, or null on an empty grid. */
export function valueUnder(values: number[][], position: LensPosition): number | null {
  const row = values[position.row];
  if (!row) return null;
  const cell = row[position.col];
  return typeof cell === 'number' ? cell : null;
}
