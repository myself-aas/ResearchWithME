export type CitationFormat = 'apa' | 'mla' | 'chicago' | 'ieee' | 'bibtex' | 'ris';

export const CITATION_FORMATS: CitationFormat[] = ['apa', 'mla', 'chicago', 'ieee', 'bibtex', 'ris'];

export interface CitationSource {
  title: string;
  author: string;
  year: string;
  journal: string;
  doi?: string;
  url?: string;
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
  year = {${year}},${doi ? `\n  doi = {${doi}},` : ''}${link ? `\n  url = {${link}},` : ''}
  publisher = {ResearchWithMe Press}
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
