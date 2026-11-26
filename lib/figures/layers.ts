/**
 * Pure logic for the LayerStack figure (archetype: accordion-layer-stack).
 * An expandable stack of architecture layers: one layer open at a time,
 * next/prev traversal, SSR renders the first layer open.
 */

export type StackLayer = {
  id: string;
  title: string;
  summary: string;
  /** Concrete facts revealed on expand; each is one verified claim. */
  facts: string[];
}

/** Open id clamped to the stack; null means nothing open (allowed). */
export function clampOpen(openId: string | null, layers: StackLayer[]): string | null {
  if (!openId) return null;
  return layers.some((layer) => layer.id === openId) ? openId : (layers[0]?.id ?? null);
}

export function nextLayer(layers: StackLayer[], currentId: string | null, step: 1 | -1): string | null {
  if (layers.length === 0) return null;
  const index = layers.findIndex((layer) => layer.id === currentId);
  const next = (index + step + layers.length) % layers.length;
  return layers[next === -1 ? 0 : next].id;
}
