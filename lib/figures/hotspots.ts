/**
 * Pure logic for the HotspotAtlas figure (archetype: pinned-hotspot-annotation).
 * Positions are percentages within the scene; the component maps them to
 * absolute layout. Cycling order is registration order.
 */

export type HotspotPoint = {
  id: string;
  label: string;
  detail: string;
  /** Horizontal position within the scene, 0–100 (percent of width). */
  x: number;
  /** Vertical position within the scene, 0–100 (percent of height). */
  y: number;
}

export function clampPoint(point: HotspotPoint): HotspotPoint {
  const clamp = (value: number) =>
    Number.isFinite(value) ? Math.min(Math.max(value, 0), 100) : 50;
  return { ...point, x: clamp(point.x), y: clamp(point.y) };
}

/** Next/previous hotspot id, wrapping around the ends. */
export function cyclePoint(points: HotspotPoint[], currentId: string | null, step: 1 | -1): string | null {
  if (points.length === 0) return null;
  const index = points.findIndex((point) => point.id === currentId);
  const next = (index + step + points.length) % points.length;
  return points[next === -1 ? 0 : next].id;
}
