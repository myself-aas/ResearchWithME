/**
 * External identifier normalization and validation — πeme v3.1 §22.2.
 * Schemes: doi, orcid, pmid, pmcid, isbn, issn, arxiv, handle, ror, rrid,
 * accession, url. Pure functions; no I/O. Validators return the repo's
 * discriminated-union shape ({ ok: true; value } | { ok: false; message }).
 */

export type IdentifierScheme =
  | 'doi'
  | 'orcid'
  | 'pmid'
  | 'pmcid'
  | 'isbn'
  | 'issn'
  | 'arxiv'
  | 'handle'
  | 'ror'
  | 'rrid'
  | 'accession'
  | 'url';

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const err = <T>(message: string): Result<T> => ({ ok: false, message });

/** DOI: normalize to lowercase, strip https://doi.org/ prefix (spec §22.2). */
export function normalizeDoi(raw: string): Result<string> {
  const v = raw.trim().toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, '').replace(/^doi:/, '');
  return /^10\.\d{4,9}\/\S+$/.test(v) ? ok(v) : err(`invalid DOI: ${raw}`);
}

/** ORCID: canonical hyphenated 16-digit form with ISO 7064 check digit. */
export function normalizeOrcid(raw: string): Result<string> {
  const v = raw.trim().toUpperCase().replace(/^https?:\/\/orcid\.org\//, '');
  if (!/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(v)) return err(`invalid ORCID: ${raw}`);
  const digits = v.replace(/-/g, '');
  let total = 0;
  for (let i = 0; i < 15; i++) total = (total + Number(digits[i])) * 2;
  const remainder = total % 11;
  const result = (12 - remainder) % 11;
  const check = result === 10 ? 'X' : String(result);
  return digits[15] === check ? ok(v) : err(`ORCID check digit mismatch: ${raw}`);
}

export function normalizePmid(raw: string): Result<string> {
  const v = raw.trim().replace(/^https?:\/\/pubmed\.ncbi\.nlm\.nih\.gov\//, '');
  return /^\d{1,9}$/.test(v) ? ok(v) : err(`invalid PMID: ${raw}`);
}

export function normalizePmcid(raw: string): Result<string> {
  const v = raw.trim().toUpperCase().replace(/^https?:\/\/www\.ncbi\.nlm\.nih\.gov\/pmc\/articles\//, '');
  return /^PMC\d{1,9}$/.test(v) ? ok(v) : err(`invalid PMCID: ${raw}`);
}

const isbnCheck = (digits: string): boolean => {
  if (digits.length === 10) {
    let sum = 0;
    for (let i = 0; i < 10; i++) sum += (10 - i) * (digits[i] === 'X' ? 10 : Number(digits[i]));
    return sum % 11 === 0;
  }
  if (digits.length === 13) {
    let sum = 0;
    for (let i = 0; i < 13; i++) sum += (i % 2 === 0 ? 1 : 3) * Number(digits[i]);
    return sum % 10 === 0;
  }
  return false;
};

/** ISBN: checksum-validated (spec §22.2), hyphens/spaces stripped. */
export function normalizeIsbn(raw: string): Result<string> {
  const v = raw.trim().replace(/[-\s]/g, '').toUpperCase();
  return (v.length === 10 || v.length === 13) && isbnCheck(v) ? ok(v) : err(`invalid ISBN: ${raw}`);
}

const issnCheck = (compact: string): boolean => {
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += (8 - i) * (compact[i] === 'X' ? 10 : Number(compact[i]));
  return sum % 11 === 0;
};

export function normalizeIssn(raw: string): Result<string> {
  const v = raw.trim().toUpperCase().replace(/\s/g, '');
  const compact = v.replace('-', '');
  return /^\d{7}[\dX]$/.test(compact) && issnCheck(compact)
    ? ok(`${compact.slice(0, 4)}-${compact.slice(4)}`)
    : err(`invalid ISSN: ${raw}`);
}

export function normalizeArxiv(raw: string): Result<string> {
  const v = raw.trim().toLowerCase().replace(/^arxiv:/, '').replace(/^https?:\/\/arxiv\.org\/(abs|pdf)\//, '').replace(/\.pdf$/, '');
  return /^\d{4}\.\d{4,5}(v\d+)?$/.test(v) || /^[a-z\-]+(\.[A-Z]{2})?\/\d{7}(v\d+)?$/.test(v)
    ? ok(v)
    : err(`invalid arXiv id: ${raw}`);
}

export function normalizeRor(raw: string): Result<string> {
  const v = raw.trim().toLowerCase().replace(/^https?:\/\/ror\.org\//, '');
  return /^0[a-hj-km-np-tv-z0-9]{6}\d{2}$/.test(v) ? ok(`https://ror.org/${v}`) : err(`invalid ROR: ${raw}`);
}

export function normalizeRrid(raw: string): Result<string> {
  const v = raw.trim().toUpperCase().replace(/^https?:\/\/rrid\.site\/data\//, '');
  return /^RRID:[A-Z]{3,10}_\d{6,}$/.test(v) ? ok(v) : err(`invalid RRID: ${raw}`);
}

export function normalizeHandle(raw: string): Result<string> {
  const v = raw.trim().toLowerCase().replace(/^https?:\/\/(dx\.)?handle\.net\//, '').replace(/^hdl:/, '');
  return /^\d+(\.\d+)?\/\S+$/.test(v) ? ok(v) : err(`invalid Handle: ${raw}`);
}

export function normalizeAccession(raw: string): Result<string> {
  const v = raw.trim().replace(/\s+/g, '');
  return /^[A-Z]{1,6}_?\d{3,}[A-Z]?$/.test(v) || /^[A-Z]+\d+$/.test(v) ? ok(v) : err(`invalid accession: ${raw}`);
}

/** URL: canonicalize scheme/host to lowercase; never drop version-identifying query params (spec §22.2). */
export function normalizeUrl(raw: string): Result<string> {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return err(`invalid URL: ${raw}`);
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return err(`unsupported URL scheme: ${raw}`);
  u.hostname = u.hostname.toLowerCase();
  u.hash = '';
  return ok(u.toString());
}

export type NormalizedIdentifier = { scheme: IdentifierScheme; value: string; normalizedValue: string; canonicalUrl?: string };

const DOI_URL = 'https://doi.org/';
const ORCID_URL = 'https://orcid.org/';

/** Validate + normalize any supported identifier. */
export function normalizeIdentifier(scheme: IdentifierScheme, raw: string): Result<NormalizedIdentifier> {
  const map: Record<IdentifierScheme, (r: string) => Result<string>> = {
    doi: normalizeDoi,
    orcid: normalizeOrcid,
    pmid: normalizePmid,
    pmcid: normalizePmcid,
    isbn: normalizeIsbn,
    issn: normalizeIssn,
    arxiv: normalizeArxiv,
    handle: normalizeHandle,
    ror: normalizeRor,
    rrid: normalizeRrid,
    accession: normalizeAccession,
    url: normalizeUrl,
  };
  const r = map[scheme](raw);
  if (!r.ok) return err(r.message);
  const canonicalUrl =
    scheme === 'doi' ? DOI_URL + r.value : scheme === 'orcid' ? ORCID_URL + r.value : scheme === 'url' ? r.value : undefined;
  return ok({ scheme, value: raw.trim(), normalizedValue: r.value, canonicalUrl });
}
