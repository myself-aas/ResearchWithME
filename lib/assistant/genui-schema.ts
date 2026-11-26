import { z } from 'zod';
import { genui } from '@/src/design/genui.manifest';

const text = z.string().trim().min(1).max(genui.limits.maxText);
const items = <T extends z.ZodType>(schema: T) => z.array(schema).min(1).max(genui.limits.maxItems);
export const statusState = z.enum(['verified', 'pending', 'unavailable', 'localLive']);
// Internal destinations or DOI links only; never javascript:, protocol-relative,
// userinfo, backslashes, or model-supplied data URLs.
export const safeHref = text.refine(value => {
  if (/\s|\\/.test(value)) return false;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'doi.org' && !url.username && !url.password;
  } catch { return false; }
}, 'Only same-origin paths and HTTPS DOI links are permitted');
export const widgetSchemas = {
  RemeStack: z.strictObject({ gap: z.enum(['3', '4', '6']).default('4') }),
  RemeSplit: z.strictObject({}),
  RemeMetricCard: z.strictObject({ label: text, value: text, detail: text.optional() }),
  RemeMetricTable: z.strictObject({ caption: text, columns: items(text).min(2), rows: items(items(text)), sourceNote: text.optional() }).refine(p => p.rows.every(row => row.length === p.columns.length), 'Every row must match the columns'),
  RemeBenchmarkChart: z.strictObject({ title: text, unit: z.enum(['%', 'score']), items: items(z.strictObject({ label: text, value: z.number().finite().min(0).max(1e9), sd: z.number().finite().min(0).max(1e9).optional() })) }).refine(p => p.unit !== '%' || p.items.every(i => i.value <= 100), 'Percentage values must be between 0 and 100'),
  RemeCitationCard: z.strictObject({ title: text, authors: text, venueYear: text, doiUrl: safeHref.optional(), bibtex: text, status: z.enum(['verified', 'pending']) }),
  RemeStatusNotice: z.strictObject({ state: statusState, detail: text }),
  RemeAuditChecklist: z.strictObject({ heading: text, items: items(text) }),
  RemeEmptyState: z.strictObject({ message: text, actionHref: safeHref.optional(), actionLabel: text.optional() }).refine(p => !!p.actionHref === !!p.actionLabel, 'Action needs both a destination and label'),
} as const;
export type WidgetName = keyof typeof widgetSchemas;
export interface ResearchNode { component: WidgetName; props: Record<string, unknown>; children?: ResearchNode[] }
export class GenUIValidationError extends Error {
  readonly code = 'INVALID_GENUI';
  constructor(message: string) { super(message); this.name = 'GenUIValidationError'; }
}
const envelope = z.strictObject({ component: z.string(), props: z.record(z.string(), z.unknown()), children: z.array(z.unknown()).optional() });
/** Validates the entire tree before any component is rendered. No HTML fallback. */
export function parseResearchTree(input: unknown): ResearchNode {
  let count = 0;
  const ancestors = new Set<object>();
  function visit(raw: unknown, depth: number): ResearchNode {
    if (++count > genui.limits.maxNodes || depth > genui.limits.maxDepth) throw new GenUIValidationError('Response exceeds the tree size limit.');
    if (raw && typeof raw === 'object' && ancestors.has(raw)) throw new GenUIValidationError('Cyclic response.');
    const parsed = envelope.safeParse(raw);
    if (!parsed.success) throw new GenUIValidationError('Invalid component envelope.');
    const { component, props, children } = parsed.data;
    if (!Object.hasOwn(widgetSchemas, component) || !genui.allowlist.includes(component as WidgetName)) throw new GenUIValidationError(`Unknown component: ${component}`);
    const name = component as WidgetName;
    const result = widgetSchemas[name].safeParse(props);
    if (!result.success) throw new GenUIValidationError(`Invalid properties for ${name}.`);
    if (children?.length && name !== 'RemeStack' && name !== 'RemeSplit') throw new GenUIValidationError(`${name} cannot have children.`);
    if (raw && typeof raw === 'object') ancestors.add(raw);
    const nodes = children?.map(child => visit(child, depth + 1));
    if (raw && typeof raw === 'object') ancestors.delete(raw);
    return { component: name, props: result.data, ...(nodes ? { children: nodes } : {}) };
  }
  return visit(input, 1);
}
