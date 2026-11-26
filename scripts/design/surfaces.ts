import type { Design } from '../../src/design';

/** Additional primitive + assistant surfaces; no independently authored CSS. */
export function surfaceCSS(d: Design): string {
  const g = d.genui;
  return `
${g.fixtures.panes.map(width => `.catalog-preview.catalog-pane-${width} { inline-size: ${width}px; max-inline-size: 100%; }`).join('\n')}
.catalog-preview, .catalog-case { inline-size: 100%; align-items: stretch; }
.r-frame-nested { aspect-ratio: ${d.primitive.frame.ratio}; overflow: hidden; }
.r-field { inline-size: 100%; font: inherit; }
.r-range { min-block-size: var(--target-min); min-inline-size: var(--target-min); inline-size: 100%; accent-color: var(--bg-brand); background: transparent; border: 0; }
.r-range::-webkit-slider-thumb { min-inline-size: var(--target-min); min-block-size: var(--target-min); }
.r-range::-moz-range-thumb { inline-size: var(--target-min); block-size: var(--target-min); }
.r-table-scroll { max-inline-size: 100%; overflow-x: auto; overscroll-behavior-inline: contain; }
.r-table { border-collapse: collapse; inline-size: 100%; font-family: var(--v4-font-sans); font-size: ${d.type.roles.meta.fixed}px; line-height: ${d.type.roles.meta.lh}; }
.r-table :is(th,td) { padding: var(--space-3); text-align: start; border-block-end: var(--border-width-hair) solid var(--border-line); vertical-align: top; overflow-wrap: anywhere; }
.r-table thead { background: var(--bg-canvas); }
.r-table caption { text-align: start; padding-block: var(--space-3); }
.r-live { display: block; color: var(--text-ink-secondary); }
.r-drawer { inline-size: ${d.primitive.drawer.width}; max-inline-size: 100%; margin-inline: auto 0; padding: var(--space-6); border: var(--border-width-hair) solid var(--border-line); }
.r-prose { max-inline-size: ${d.type.roles.body.measureCh}ch; line-height: ${d.type.roles.body.lh}; }
.genui-surface { container-type: ${g.surface.container}; inline-size: 100%; max-inline-size: ${g.surface.maxInline}px; min-block-size: ${g.streaming.reserveMinHeightPx}px; overflow-wrap: anywhere; }
.genui-surface * { min-inline-size: 0; box-sizing: border-box; }
.genui-stack { display: grid; }
${g.layoutGrammar.stack.gap.map(step => `.genui-spacing-${step} { gap: var(--space-${step}); }`).join('\n')}
.genui-split { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-${g.layoutGrammar.split.gap}); }
@container (min-width: ${g.layoutGrammar.split.minColPx * 2 + 1}px) { .genui-split { grid-template-columns: repeat(${g.layoutGrammar.split.maxCols}, minmax(0, 1fr)); } }
.genui-widget { margin: 0; padding: var(--space-4); background: var(--${g.surface.bg}); border: var(--border-width-${g.surface.border}) solid var(--border-line); border-radius: var(--radius-v4-inset); max-inline-size: 100%; }
.genui-actions { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: center; }
.genui-actions > *, .genui-actions button { max-inline-size: 100%; }
.genui-code { inline-size: 100%; white-space: pre-wrap; overflow-wrap: anywhere; font-family: var(--v4-font-mono); font-size: ${d.type.roles.meta.fixed}px; }
.genui-check-label { display: flex; align-items: center; gap: var(--space-3); min-block-size: var(--target-min); padding-block: var(--space-2); }
.genui-check-label input { flex: 0 0 var(--target-min); inline-size: var(--target-min); block-size: var(--target-min); accent-color: var(--text-ink); }
.genui-chart { inline-size: 100%; block-size: auto; overflow: visible; }
${[1, 2, 3, 4].map(n => `.genui-series-${n} { fill: var(--series-${n}); }`).join('\n')}
.genui-bar-label { font: ${d.space.steps[1]}px var(--v4-font-mono); fill: var(--bg-canvas); }
.assistant-info-grid { display: grid; gap: var(--space-6); }
@media (min-width: ${d.breakpoint.md.min}px) { .assistant-info-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.assistant-shell { inline-size: 100%; min-inline-size: 0; border: var(--border-width-hair) solid var(--border-line); border-radius: var(--radius-v4-xl); overflow: hidden; background: var(--bg-surface); }
.assistant-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); padding: var(--space-4); border-block-end: var(--border-width-hair) solid var(--border-line); }
.assistant-thread { display: flex; flex-direction: column; block-size: ${d.space.steps[16] * 9}px; max-block-size: 85dvh; }
.assistant-viewport-wrap { position: relative; display: flex; flex: 1; min-block-size: 0; }
.assistant-viewport { flex: 1; min-inline-size: 0; overflow-y: auto; padding: var(--space-4); }
.assistant-messages { inline-size: 100%; align-items: stretch; gap: var(--space-5); }
.assistant-message { align-items: stretch; max-inline-size: 100%; }
.assistant-user { display: flex; justify-content: flex-end; }
.assistant-user-bubble { max-inline-size: 85%; background: var(--bg-canvas); border: var(--border-width-hair) solid var(--border-line); border-radius: var(--radius-v4-lg); padding: var(--space-4); }
.assistant-whitespace { white-space: pre-wrap; }
.assistant-label { display: flex; align-items: center; gap: var(--space-2); }
.assistant-answer { min-inline-size: 0; max-inline-size: 100%; }
.assistant-empty { padding-block: var(--space-6); }
.assistant-composer { padding: var(--space-3); border-block-start: var(--border-width-hair) solid var(--border-line); }
.assistant-composer-row { display: flex; align-items: flex-end; gap: var(--space-2); margin-block-end: var(--space-2); }
.assistant-input { flex: 1; min-inline-size: 0; max-block-size: ${d.space.steps[16] * 2}px; resize: vertical; }
.assistant-scroll { position: absolute; inset-block-end: var(--space-3); inset-inline-end: var(--space-3); }
.assistant-model { padding-block: var(--space-6); }
.reme-page .assistant-markdown { font-family: var(--v4-font-sans); font-size: ${d.type.roles.body.fixed}px; line-height: ${d.type.roles.body.lh}; overflow-wrap: anywhere; }
.reme-page .assistant-markdown :is(pre,table) { max-inline-size: 100%; overflow-x: auto; }
.reme-page .assistant-markdown a { color: var(--text-ink); text-decoration: underline; }
`;
}
