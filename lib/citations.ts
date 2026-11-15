export type CitationFormat = 'apa' | 'mla' | 'chicago' | 'ieee' | 'bibtex' | 'ris';

export const CITATION_FORMATS: CitationFormat[] = ['apa', 'mla', 'chicago', 'ieee', 'bibtex', 'ris'];

export interface CitationSource {
  title: string;
  author: string;
  year: string;
  journal: string;
  doi?: string;
  url?: string;
  /** Null omits a platform publisher for sources that are not ResearchWithMe publications. */
  publisher?: string | null;
}

function splitName(author: string) {
  const parts = author.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (parts.length === 0) return { first: 'Author', last: 'Author' };
  if (parts.length === 1) return { first: parts[0], last: parts[0] };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}

function cleanDoi(doi = '') {
  return doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '').trim();
}

function doiUrl(doi: string) {
  const cleaned = cleanDoi(doi);
  if (!cleaned) return '';
  if (/^10\./i.test(cleaned)) return `https://doi.org/${cleaned}`;
  return '';
}

function bibtexKey(source: CitationSource) {
  const { last } = splitName(source.author);
  return `${last.toLowerCase().replace(/[^a-z0-9]/g, '')}${source.year.replace(/[^0-9]/g, '') || 'nd'}`;
}

export function buildCitation(format: CitationFormat, source: CitationSource) {
  const { first, last } = splitName(source.author);
  const title = source.title.trim() || 'Untitled';
  const journal = source.journal.trim() || 'ResearchWithMe';
  const year = source.year.trim() || 'n.d.';
  const doi = cleanDoi(source.doi);
  const link = doiUrl(doi) || source.url?.trim() || '';

  switch (format) {
    case 'apa':
      return `${last}, ${first.charAt(0)}. (${year}). ${title}. ${journal}.${link ? ` ${link}` : ''}`;
    case 'mla':
      return `${last}, ${first}. "${title}." ${journal}, ${year}${link ? `, ${link}` : ''}.`;
    case 'chicago':
      return `${last}, ${first}. "${title}." ${journal} (${year})${link ? `. ${link}` : ''}.`;
    case 'ieee':
      return `[1] ${first.charAt(0)}. ${last}, "${title}," ${journal}, ${year}.${doi ? ` doi: ${doi}.` : ''}`;
    case 'bibtex':
      return `@article{${bibtexKey(source)},
  title = {${title}},
  author = {${source.author}},
  journal = {${journal}},
  year = {${year}},${doi ? `\n  doi = {${doi}},` : ''}${link ? `\n  url = {${link}},` : ''}${source.publisher === null ? '' : `\n  publisher = {${source.publisher ?? 'ResearchWithMe Press'}}`}
}`;
    case 'ris':
      return `TY  - JOUR
TI  - ${title}
AU  - ${source.author}
JO  - ${journal}
PY  - ${year}${doi ? `\nDO  - ${doi}` : ''}${link ? `\nUR  - ${link}` : ''}
ER  - `;
    default:
      return '';
  }
}

export function citationFileExtension(format: CitationFormat) {
  if (format === 'ris') return 'ris';
  if (format === 'bibtex') return 'bib';
  return 'txt';
}

// ── reme v3.1 Citation component additions (§7): short/full/machine views + CSL-JSON ──

export type CitationView = 'short' | 'full' | 'machine';

/** Short view: "Last (Year). Title." — for inline references. */
export function shortCitation(source: CitationSource): string {
  const { first, last } = splitName(source.author);
  const title = source.title.trim() || 'Untitled';
  const year = source.year.trim() || 'n.d.';
  const shortTitle = title.length > 60 ? `${title.slice(0, 57)}…` : title;
  return `${last}, ${first.charAt(0)}. (${year}). ${shortTitle}.`;
}

/** Full view: APA (the platform's default full reference). */
export function fullCitation(source: CitationSource): string {
  return buildCitation('apa', source);
}

export type MachineFormat = 'bibtex' | 'ris' | 'csl-json';

/** CSL-JSON export (spec §7) — validates as JSON with required CSL fields. */
export function cslJson(source: CitationSource): string {
  const doi = cleanDoi(source.doi);
  const link = doiUrl(doi) || source.url?.trim() || '';
  const csl = {
    id: bibtexKey(source),
    type: 'article-journal',
    title: source.title.trim() || 'Untitled',
    author: [{ family: splitName(source.author).last, given: splitName(source.author).first }],
    'container-title': source.journal.trim() || 'ResearchWithMe',
    issued: { 'date-parts': [[Number(source.year.replace(/[^0-9]/g, '')) || 0]] },
    ...(doi ? { DOI: doi } : {}),
    ...(link ? { URL: link } : {}),
  };
  return JSON.stringify(csl, null, 2);
}

/** Machine-readable view: BibTeX, RIS, or CSL-JSON. */
export function machineCitation(format: MachineFormat, source: CitationSource): string {
  if (format === 'csl-json') return cslJson(source);
  return buildCitation(format, source);
}
