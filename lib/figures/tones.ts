/**
 * Token-backed palettes for figure data (Constitution Article 6).
 *
 * A component's *chrome* (borders, text, controls) uses semantic Tailwind
 * token classes directly. A component's *data* — the colour a cell or bar
 * receives — arrives as a tone *name* on a prop and resolves through the maps
 * below. Raw hex values never appear in fixtures or components, so the whole
 * library follows the token authority in `tokens/src/` and re-skins with the
 * palette (including the no-blue rule) without touching figure code.
 */

export type FigureTone = 'brand' | 'emerging' | 'insight' | 'ink';

/** Solid fills, one per tone name. */
export const TONE_FILL: Record<FigureTone, string> = {
  brand: 'bg-brand',
  emerging: 'bg-trust-emerging',
  insight: 'bg-knowledge-insight',
  ink: 'bg-ink',
};

/** Value ramps: five opacity steps from strongest to weakest, per tone. */
export const TONE_RAMP: Record<FigureTone, readonly [string, string, string, string, string]> = {
  brand: ['bg-brand/85', 'bg-brand/60', 'bg-brand/40', 'bg-brand/25', 'bg-surface-subtle'],
  emerging: [
    'bg-trust-emerging/85',
    'bg-trust-emerging/60',
    'bg-trust-emerging/40',
    'bg-trust-emerging/25',
    'bg-surface-subtle',
  ],
  insight: [
    'bg-knowledge-insight/85',
    'bg-knowledge-insight/60',
    'bg-knowledge-insight/40',
    'bg-knowledge-insight/25',
    'bg-surface-subtle',
  ],
  ink: ['bg-ink/80', 'bg-ink/60', 'bg-ink/40', 'bg-ink/25', 'bg-surface-subtle'],
};

/**
 * Map a value to one of `ramp.length` buckets. `max` clamps at 0 to keep a
 * degenerate grid renderable; anything above `max` saturates at step 0.
 */
export function shadeFor(value: number, max: number, tone: FigureTone): string {
  const ramp = TONE_RAMP[tone] ?? TONE_RAMP.brand;
  if (!(max > 0)) return ramp[ramp.length - 1];
  const normalized = Math.min(Math.max(value / max, 0), 1);
  const step = Math.min(Math.floor((1 - normalized) * ramp.length), ramp.length - 1);
  return ramp[Math.max(step, 0)];
}
