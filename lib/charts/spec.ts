/**
 * Chart authoring grammar for article Markdown.
 *
 * Authors write a fenced block tagged `chart`, so nothing new enters the editor:
 *
 * ```chart
 * type: line
 * title: Citations per year
 * caption: Growth is measured on a log scale.
 * x: Year
 * y: Citations
 * y-scale: log
 * series: Peer-reviewed, Preprints
 * 2019: 120, 40
 * 2020: 310, 155
 * 2021: nil, 402
 * ```
 *
 * Everything here is deliberately boring and total: the parser takes a string and
 * returns a discriminated union, never throws, and reports a line-numbered
 * problem instead. Why it is not JSON or YAML:
 *
 * - Authors already write Markdown tables, so `2019: 120, 40` is the shape they
 *   know. JSON in a study would be foreign and error-prone.
 * - A chart spec is data an editor types by hand under review pressure. A typo
 *   should name the line, not produce a stack trace, and must never blank the
 *   article around it.
 * - No dependency. `JSON.parse` handles the `null` literal already, and the
 *   config keys are a fixed whitelist.
 *
 * The `y-scale: log` / `notes:` / `n:` fields exist to satisfy DESIGN §32:
 * truncation, log scale, smoothing, and sample size must be disclosed, and
 * missing data must be labelled rather than plotted as zero. `nil` becomes
 * `null` and is skipped by the renderer, never coerced to 0.
 */

export type ChartType = 'line' | 'bar' | 'area' | 'scatter';

export type ChartScale = 'linear' | 'log';

export interface ChartPoint {
  /** Category label for the x axis (a year, a cohort, a group name). */
  x: string;
  /** One value per series, in `series` order. `null` means missing. */
  values: Array<number | null>;
}

export interface ChartSeries {
  name: string;
  values: Array<number | null>;
}

export interface ChartSpec {
  type: ChartType;
  title: string;
  /** Plain-language description of what the reader should see. Required. */
  caption: string;
  xLabel: string;
  yLabel: string;
  yScale: ChartScale;
  series: ChartSeries[];
  points: ChartPoint[];
  /** Sample size, units, or statistical method, shown beside the figure. */
  notes?: string;
  /** Optional per-series error bars (±). Used for line/bar. */
  uncertainty?: number[];
}

export type ChartParseResult =
  | { ok: true; spec: ChartSpec }
  | { ok: false; error: string; line?: number };

const TYPES: ChartType[] = ['line', 'bar', 'area', 'scatter'];
const SCALES: ChartScale[] = ['linear', 'log'];

/** Missing values, spelled the ways an author might reasonably spell them. */
const MISSING = new Set(['nil', 'null', 'na', 'n/a', '-', '—', '…', '']);

const CONFIG_KEYS = new Set([
  'type', 'title', 'caption', 'x', 'y', 'y-scale', 'series', 'notes', 'uncertainty',
]);

/** Split on commas that are not inside quotes, so a label may contain a comma. */
function splitCells(input: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (const ch of input) {
    if (ch === '"') { quoted = !quoted; cur += ch; continue; }
    if (ch === ',' && !quoted) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function unquote(cell: string): string {
  const t = cell.trim();
  return t.startsWith('"') && t.endsWith('"') && t.length >= 2 ? t.slice(1, -1) : t;
}

function parseNumber(cell: string): number | null {
  const t = unquote(cell);
  if (MISSING.has(t.toLowerCase())) return null;
  // Tolerate thousands separators, but nothing else.
  const n = Number(t.replace(/_/g, '').replace(/,(?=\d{3}\b)/g, ''));
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse a `chart` fenced block.
 *
 * Config lines are `key: value`; data lines are `x-label: v1, v2, …`. A line is
 * treated as data when its key is not a known config key, which keeps the
 * grammar small and forgiving: authors never have to quote a year.
 */
export function parseChartSpec(source: string): ChartParseResult {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');

  const config = new Map<string, string>();
  const rows: Array<{ line: number; label: string; cells: string[] }> = [];
  let seriesNames: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const lineNo = i + 1;

    const sep = line.indexOf(':');
    if (sep === -1) {
      return { ok: false, error: `Expected "key: value" — saw "${line}".`, line: lineNo };
    }
    const key = line.slice(0, sep).trim().toLowerCase();
    const value = line.slice(sep + 1).trim();

    if (CONFIG_KEYS.has(key)) {
      if (key === 'series') {
        seriesNames = splitCells(value).map(unquote).filter(Boolean);
        if (seriesNames.length === 0) {
          return { ok: false, error: 'series: needs at least one name.', line: lineNo };
        }
      } else {
        config.set(key, value);
      }
      continue;
    }

    // A data row. The key is the x label, so preserve its original casing.
    const label = raw.slice(0, raw.indexOf(':')).trim();
    rows.push({ line: lineNo, label: unquote(label), cells: splitCells(value) });
  }

  const type = (config.get('type') ?? 'line').toLowerCase() as ChartType;
  if (!TYPES.includes(type)) {
    return { ok: false, error: `type: must be one of ${TYPES.join(', ')} — saw "${type}".` };
  }
  const yScale = (config.get('y-scale') ?? 'linear').toLowerCase() as ChartScale;
  if (!SCALES.includes(yScale)) {
    return { ok: false, error: `y-scale: must be linear or log — saw "${yScale}".` };
  }
  const title = config.get('title')?.trim();
  if (!title) return { ok: false, error: 'A chart needs a title.' };
  const caption = config.get('caption')?.trim();
  if (!caption) {
    // DESIGN §32 requires an accessible textual equivalent. Make it mandatory
    // rather than optional so an author cannot ship a figure nobody can read.
    return { ok: false, error: 'A chart needs a caption — it is the text alternative.' };
  }

  if (rows.length === 0) return { ok: false, error: 'A chart needs at least one data row.' };

  // If the author never declared series, derive them from the widest row.
  const width = Math.max(...rows.map((r) => r.cells.length));
  if (seriesNames.length === 0) {
    if (width > 1) {
      return { ok: false, error: 'Multiple values per row need a "series:" line naming them.' };
    }
    seriesNames = [config.get('y')?.trim() || 'Value'];
  }
  if (width > seriesNames.length) {
    const bad = rows.find((r) => r.cells.length > seriesNames.length)!;
    return {
      ok: false,
      error: `Row has ${bad.cells.length} values but only ${seriesNames.length} series are named.`,
      line: bad.line,
    };
  }

  const points: ChartPoint[] = rows.map((r) => {
    const values = seriesNames.map((_, idx) => parseNumber(r.cells[idx] ?? ''));
    return { x: r.label, values };
  });

  const series: ChartSeries[] = seriesNames.map((name, idx) => ({
    name,
    values: points.map((p) => p.values[idx] ?? null),
  }));

  const uncertaintyRaw = config.get('uncertainty');
  let uncertainty: number[] | undefined;
  if (uncertaintyRaw) {
    const parsed = splitCells(uncertaintyRaw).map((c) => parseNumber(c));
    if (parsed.some((n) => n === null || n < 0)) {
      return { ok: false, error: 'uncertainty: must be non-negative numbers.' };
    }
    uncertainty = parsed as number[];
  }

  // A log scale cannot express a zero, and a negative value is meaningless
  // there. Say so at authoring time rather than drawing an axis that lies.
  if (yScale === 'log') {
    const bad = points.find((p) => p.values.some((v) => v !== null && v <= 0));
    if (bad) {
      return {
        ok: false,
        error: `y-scale: log cannot plot zero or negative values (row "${bad.x}").`,
      };
    }
  }

  return {
    ok: true,
    spec: {
      type,
      title,
      caption,
      xLabel: config.get('x')?.trim() || '',
      yLabel: config.get('y')?.trim() || '',
      yScale,
      series,
      points,
      notes: config.get('notes')?.trim() || undefined,
      uncertainty,
    },
  };
}

/** Detect the `<pre><code class="language-chart">` shape our renderer sees. */
export function isChartLanguage(className: string | undefined): boolean {
  return typeof className === 'string' && /language-chart\b/.test(className);
}
