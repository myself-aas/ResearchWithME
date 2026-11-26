'use client';

import { useState } from 'react';
import { toSpecCatalog } from '@assistant-ui/generative-ui/spec';
import { SpecRenderer } from 'generative-frame/spec/react';
import type { Spec } from 'generative-frame/spec';
import type { ToolCallMessagePartProps } from '@assistant-ui/react';
import { widgetSchemas, parseResearchTree, type ResearchNode } from '@/lib/assistant/genui-schema';
import { StatusBadge } from '@/components/design/ExtendedPrimitives';

function CopyCitation({ text }: { text: string }) {
  const [message, setMessage] = useState('');
  async function copy() {
    try { await navigator.clipboard.writeText(text); setMessage('BibTeX copied.'); }
    catch { setMessage('Copy unavailable. Select and copy the citation above.'); }
  }
  return <><button type="button" className="r-control-secondary" onClick={copy}>Copy BibTeX</button><output className="r-meta" aria-live="polite">{message}</output></>;
}

// No default vocabulary, HTML widget, dynamic import, style or event from the
// payload. All props have already passed the strict host schemas.
const library = {
  RemeStack: { description: 'Vertical response layout.', properties: widgetSchemas.RemeStack, render: ({ gap, children }: { gap: '3' | '4' | '6'; children?: React.ReactNode }) => <div className={`genui-stack genui-spacing-${gap}`}>{children}</div> },
  RemeSplit: { description: 'Two columns only when the message container permits.', properties: widgetSchemas.RemeSplit, render: ({ children }: { children?: React.ReactNode }) => <div className="genui-split">{children}</div> },
  RemeMetricCard: { description: 'A labeled numeric observation.', properties: widgetSchemas.RemeMetricCard, slots: [], render: ({ label, value, detail }: { label: string; value: string; detail?: string }) => <section className="genui-widget r-flow"><h3 className="r-h3">{label}</h3><p className="r-body">{value}</p>{detail && <p className="r-meta r-muted">{detail}</p>}</section> },
  RemeMetricTable: { description: 'An accessible comparison table.', properties: widgetSchemas.RemeMetricTable, slots: [], render: ({ caption, columns, rows, sourceNote }: { caption: string; columns: string[]; rows: string[][]; sourceNote?: string }) => <div className="genui-widget"><div className="r-table-scroll" role="region" aria-label={caption} tabIndex={0}><table className="r-table" data-primitive="table"><caption>{caption}</caption><thead><tr>{columns.map((col, i) => <th key={i} scope="col">{col}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => j === 0 ? <th key={j} scope="row">{cell}</th> : <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>{sourceNote && <p className="r-meta r-muted">{sourceNote}</p>}</div> },
  RemeBenchmarkChart: { description: 'Bars with a visible table; percentages always use 0–100.', properties: widgetSchemas.RemeBenchmarkChart, slots: [], render: ({ title, unit, items }: { title: string; unit: '%' | 'score'; items: { label: string; value: number; sd?: number }[] }) => {
    const max = unit === '%' ? 100 : Math.max(1, ...items.map(item => item.value));
    return <figure className="genui-widget r-flow"><figcaption className="r-h3">{title}</figcaption><p className="r-meta">Scale: 0–{max}{unit === '%' ? '%' : ' score'}</p><svg className="genui-chart" viewBox={`0 0 100 ${items.length * 12}`} role="img" aria-label={`${title}. Values are in the table below.`}>{items.map((item, i) => <g key={i}><rect className={`genui-series-${i % 4 + 1}`} x="0" y={i * 12 + 1} width={item.value / max * 100} height="8" /><text className="genui-bar-label" x="1" y={i * 12 + 7}>{i + 1}</text></g>)}</svg><div className="r-table-scroll" role="region" aria-label={title} tabIndex={0}><table className="r-table"><caption>{title}</caption><thead><tr><th scope="col">Observation</th><th scope="col">Value ({unit})</th><th scope="col">SD</th></tr></thead><tbody>{items.map((item, i) => <tr key={i}><th scope="row">{i + 1}. {item.label}</th><td>{item.value}</td><td>{item.sd ?? 'Not reported'}</td></tr>)}</tbody></table></div></figure>;
  } },
  RemeCitationCard: { description: 'Citation with DOI and copyable BibTeX.', properties: widgetSchemas.RemeCitationCard, slots: [], render: ({ title, authors, venueYear, doiUrl, bibtex, status }: { title: string; authors: string; venueYear: string; doiUrl?: string; bibtex: string; status: 'verified' | 'pending' }) => <article className="genui-widget r-flow"><StatusBadge state={status} /><h3 className="r-h3">{title}</h3><p className="r-meta">{authors} · {venueYear}</p><pre className="genui-code"><code>{bibtex}</code></pre><div className="genui-actions">{doiUrl && <a className="r-control-secondary" href={doiUrl}>Open source</a>}<CopyCitation text={bibtex} /></div></article> },
  RemeStatusNotice: { description: 'Status always includes icon and localized host label.', properties: widgetSchemas.RemeStatusNotice, slots: [], render: ({ state, detail }: { state: 'verified' | 'pending' | 'unavailable' | 'localLive'; detail: string }) => <div className="genui-widget r-flow"><StatusBadge state={state} /><p className="r-body">{detail}</p></div> },
  RemeAuditChecklist: { description: 'Accessible research verification checklist.', properties: widgetSchemas.RemeAuditChecklist, slots: [], render: ({ heading, items }: { heading: string; items: string[] }) => <section className="genui-widget r-flow"><h3 className="r-h3">{heading}</h3><ul className="r-list">{items.map((item, i) => <li key={i}><label className="genui-check-label"><input type="checkbox" /><span className="r-body">{item}</span></label></li>)}</ul></section> },
  RemeEmptyState: { description: 'Explicit text empty state.', properties: widgetSchemas.RemeEmptyState, slots: [], render: ({ message, actionHref, actionLabel }: { message: string; actionHref?: string; actionLabel?: string }) => <div className="genui-widget r-flow"><p className="r-body">{message}</p>{actionHref && <a className="r-control-secondary" href={actionHref}>{actionLabel}</a>}</div> },
};
export const remeGenUICatalog = toSpecCatalog(library, { imageOrigins: [] });

function asSpec(root: ResearchNode): Spec {
  const elements: Spec['elements'] = {};
  let next = 0;
  function visit(node: ResearchNode): string {
    const id = `reme-${next++}`;
    elements[id] = { type: node.component, props: node.props, children: node.children?.map(visit) ?? [] };
    return id;
  }
  return { root: visit(root), elements };
}
/** Whole-tree validation is stricter than the upstream per-node placeholder. */
export function ResearchUI({ value, streaming = false }: { value: unknown; streaming?: boolean }) {
  if (streaming) return <div className="genui-surface" data-streaming="true"><output className="r-meta" aria-live="polite">Preparing the research view…</output></div>;
  try {
    const spec = asSpec(parseResearchTree(value));
    return <div className="genui-surface" data-streaming="false"><SpecRenderer spec={spec} catalog={remeGenUICatalog.catalog} components={remeGenUICatalog.components} /></div>;
  } catch {
    return <div className="genui-surface"><StatusBadge state="unavailable" /><p className="r-body" role="status">This research view could not be verified. Use the quoted archive answer or search instead.</p></div>;
  }
}
export function ResearchSummaryTool(props: ToolCallMessagePartProps) {
  return <ResearchUI value={props.args} streaming={props.status.type === 'running'} />;
}
