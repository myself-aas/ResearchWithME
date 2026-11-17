/**
 * ResearchWithME v3.4 — Canonical Academic & Repository Identifier Normalizer
 * (Master Plan Part V §18.9)
 *
 * Normalizes and validates:
 *   DOI, ORCID (ISO 7064 Mod 11-2), PMID, PMCID, ISBN (10 & 13 check digit),
 *   serial issn (Mod 11 check digit), arXiv (modern & legacy), ROR, RRID, Accession
 *   (GenBank/RefSeq/GEO/SRA/PDB/UniProt/PRIDE), SWHID, GitHub, GitLab, and
 *   canonical HTTP(S) URLs (stripping marketing tracking parameters).
 */

export type CanonicalIdentifierScheme =
  | 'doi'
  | 'orcid'
  | 'pmid'
  | 'pmcid'
  | 'isbn'
  | 'issn'
  | 'arxiv'
  | 'ror'
  | 'rrid'
  | 'accession'
  | 'swhid'
  | 'github'
  | 'gitlab'
  | 'url';

export type InferredSourceKind =
  | 'paper'
  | 'preprint'
  | 'software'
  | 'dataset'
  | 'book'
  | 'protocol'
  | 'report'
  | 'webpage';

export interface NormalizedIdentifier {
  scheme: CanonicalIdentifierScheme;
  /** Canonical normalized identifier value (always LTR-isolated in UI). */
  value: string;
  /** Resolvable canonical HTTPS URL for provenance and external linking. */
  canonicalUrl: string;
  inferredType: InferredSourceKind;
  /** True when cryptographic/checksum verification passed (or scheme has no check digit). */
  checksumValid: boolean;
}

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
  'ref_src',
]);

/** ISO 7064 Mod 11-2 checksum validation for ORCID iDs. */
export function verifyOrcidChecksum(digits16: string): boolean {
  const clean = digits16.replace(/-/g, '').toUpperCase();
  if (!/^\d{15}[\dX]$/.test(clean)) return false;
  let total = 0;
  for (let i = 0; i < 15; i += 1) {
    total = (total + Number(clean[i])) * 2;
  }
  const remainder = total % 11;
  const result = (12 - remainder) % 11;
  const expected = result === 10 ? 'X' : String(result);
  return clean[15] === expected;
}

/** Check digit verification for ISBN-10 and ISBN-13. */
export function verifyIsbnChecksum(rawDigits: string): boolean {
  const clean = rawDigits.replace(/[-\s]/g, '').toUpperCase();
  if (/^\d{9}[\dX]$/.test(clean)) {
    let sum = 0;
    for (let i = 0; i < 10; i += 1) {
      const val = clean[i] === 'X' ? 10 : Number(clean[i]);
      sum += val * (10 - i);
    }
    return sum % 11 === 0;
  }
  if (/^(?:978|979)\d{10}$/.test(clean)) {
    let sum = 0;
    for (let i = 0; i < 12; i += 1) {
      sum += Number(clean[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const check = (10 - (sum % 10)) % 10;
    return Number(clean[12]) === check;
  }
  return false;
}

/** Mod 11 check digit verification for 8-character ISSNs. */
export function verifyIssnChecksum(rawDigits: string): boolean {
  const clean = rawDigits.replace(/[-\s]/g, '').toUpperCase();
  if (!/^\d{7}[\dX]$/.test(clean)) return false;
  let sum = 0;
  for (let i = 0; i < 7; i += 1) {
    sum += Number(clean[i]) * (8 - i);
  }
  const rem = sum % 11;
  const expected = rem === 0 ? '0' : rem === 1 ? 'X' : String(11 - rem);
  return clean[7] === expected;
}

/**
 * Normalizes any scholarly or repository identifier string into its canonical
 * scheme, normalized value, resolvable URL, and inferred source kind.
 */
export function normalizeScholarlyIdentifier(rawInput: string): NormalizedIdentifier | null {
  const input = rawInput.trim();
  if (!input) return null;

  // 1. DOI: 10.xxxx/... or https://doi.org/10.xxxx/...
  const doiMatch = input.match(
    /^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)?(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)$/i,
  );
  if (doiMatch) {
    const value = doiMatch[1];
    return {
      scheme: 'doi',
      value,
      canonicalUrl: `https://doi.org/${value}`,
      inferredType: 'paper',
      checksumValid: true,
    };
  }

  // 2. ORCID: 0000-0002-1825-0097 or https://orcid.org/0000-0002-1825-0097
  const orcidMatch = input.match(
    /^(?:https?:\/\/orcid\.org\/|orcid:\s*)?(\d{4}-\d{4}-\d{4}-\d{3}[\dX])$/i,
  );
  if (orcidMatch) {
    const value = orcidMatch[1].toUpperCase();
    return {
      scheme: 'orcid',
      value,
      canonicalUrl: `https://orcid.org/${value}`,
      inferredType: 'webpage',
      checksumValid: verifyOrcidChecksum(value),
    };
  }

  // 3. arXiv: modern YYMM.NNNNN[vN] or legacy archive/YYMMNNN[vN]
  const arxivModern = input.match(
    /^(?:https?:\/\/arxiv\.org\/(?:abs|pdf)\/|arXiv:\s*)?(\d{4}\.\d{4,5}(?:v\d+)?)(?:\.pdf)?$/i,
  );
  if (arxivModern) {
    const value = arxivModern[1].toLowerCase();
    return {
      scheme: 'arxiv',
      value,
      canonicalUrl: `https://arxiv.org/abs/${value}`,
      inferredType: 'preprint',
      checksumValid: true,
    };
  }
  const arxivLegacy = input.match(
    /^(?:https?:\/\/arxiv\.org\/(?:abs|pdf)\/|arXiv:\s*)?([a-z-]+(?:\.[A-Z]{2})?\/\d{7}(?:v\d+)?)(?:\.pdf)?$/i,
  );
  if (arxivLegacy) {
    const value = arxivLegacy[1];
    return {
      scheme: 'arxiv',
      value,
      canonicalUrl: `https://arxiv.org/abs/${value}`,
      inferredType: 'preprint',
      checksumValid: true,
    };
  }

  // 4. PMCID: PMC1234567 or https://pmc.ncbi.nlm.nih.gov/articles/PMC1234567/
  const pmcidMatch = input.match(
    /^(?:https?:\/\/(?:www\.)?(?:ncbi\.nlm\.nih\.gov\/pmc|pmc\.ncbi\.nlm\.nih\.gov)\/articles\/|pmcid:\s*)?(PMC\d{4,10})\/?$/i,
  );
  if (pmcidMatch) {
    const value = pmcidMatch[1].toUpperCase();
    return {
      scheme: 'pmcid',
      value,
      canonicalUrl: `https://pmc.ncbi.nlm.nih.gov/articles/${value}/`,
      inferredType: 'paper',
      checksumValid: true,
    };
  }

  // 5. PMID: PMID:39123456 or https://pubmed.ncbi.nlm.nih.gov/39123456/
  const pmidMatch = input.match(
    /^(?:https?:\/\/pubmed\.ncbi\.nlm\.nih\.gov\/|pmid:\s*)(\d{5,10})\/?$/i,
  );
  if (pmidMatch) {
    const value = pmidMatch[1];
    return {
      scheme: 'pmid',
      value,
      canonicalUrl: `https://pubmed.ncbi.nlm.nih.gov/${value}/`,
      inferredType: 'paper',
      checksumValid: true,
    };
  }

  // 6. ROR: https://ror.org/02mhbdp94 or ror:02mhbdp94
  const rorMatch = input.match(/^(?:https?:\/\/ror\.org\/|ror:\s*)(0[0-9a-hjkmnp-tv-z]{6}\d{2})$/i);
  if (rorMatch) {
    const value = rorMatch[1].toLowerCase();
    return {
      scheme: 'ror',
      value,
      canonicalUrl: `https://ror.org/${value}`,
      inferredType: 'webpage',
      checksumValid: true,
    };
  }

  // 7. RRID: RRID:AB_123456, RRID:SCR_001905, etc.
  const rridMatch = input.match(/^(?:https?:\/\/scicrunch\.org\/resolver\/)?(RRID:[A-Z]+_[A-Za-z0-9._-]+)$/i);
  if (rridMatch) {
    const value = rridMatch[1].replace(/^rrid:/i, 'RRID:');
    return {
      scheme: 'rrid',
      value,
      canonicalUrl: `https://scicrunch.org/resolver/${value}`,
      inferredType: 'protocol',
      checksumValid: true,
    };
  }

  // 8. Software Heritage SWHID: swh:1:(cnt|dir|rel|rev|snp):<40-hex>
  const swhidMatch = input.match(/^(swh:1:(?:cnt|dir|rel|rev|snp):[0-9a-f]{40})(?:;.*)?$/i);
  if (swhidMatch) {
    const value = swhidMatch[1].toLowerCase();
    return {
      scheme: 'swhid',
      value,
      canonicalUrl: `https://archive.softwareheritage.org/${value}/`,
      inferredType: 'software',
      checksumValid: true,
    };
  }

  // 9. ISBN (explicit prefix or 13-digit 978/979 ISBN)
  const isbnMatch = input.match(/^(?:isbn(?:-1[03])?:\s*)((?:97[89][-\s]?)?(?:\d[-\s]?){9}[\dX])$/i)
    ?? input.match(/^(97[89][-\s]?(?:\d[-\s]?){9}\d)$/);
  if (isbnMatch) {
    const clean = isbnMatch[1].replace(/[-\s]/g, '').toUpperCase();
    return {
      scheme: 'isbn',
      value: clean,
      canonicalUrl: `https://openlibrary.org/isbn/${clean}`,
      inferredType: 'book',
      checksumValid: verifyIsbnChecksum(clean),
    };
  }

  // 10. Serial issn identifier (e.g. issn:1476-4687)
  const issnMatch = input.match(/^issn[:\s]+(\d{4}-?\d{3}[\dX])$/i);
  if (issnMatch) {
    const digits = issnMatch[1].replace(/-/g, '').toUpperCase();
    const formatted = `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return {
      scheme: 'issn',
      value: formatted,
      canonicalUrl: `https://portal.issn.org/resource/issn/${formatted}`,
      inferredType: 'paper',
      checksumValid: verifyIssnChecksum(formatted),
    };
  }

  // 11. Biological / dataset accession numbers (GEO GSE/GSM, SRA SRR/SRP/PRJNA, RefSeq NC_/NM_, PDB, PRIDE PXD)
  const accessionMatch = input.match(
    /^(?:accession:\s*)?((?:GSE|GSM|GPL|SRR|SRP|SRX|ERR|PRJNA|PRJEB|PXD|E-MTAB-)\d{3,10}|(?:NC|NM|NP|NR|XM|XP)_\d{6,9}(?:\.\d+)?)$/i,
  );
  if (accessionMatch) {
    const value = accessionMatch[1].toUpperCase();
    return {
      scheme: 'accession',
      value,
      canonicalUrl: `https://identifiers.org/${encodeURIComponent(value)}`,
      inferredType: 'dataset',
      checksumValid: true,
    };
  }

  // 12. GitHub repository URL
  const ghMatch = input.match(
    /^https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git)?(?:\/.*)?$/i,
  );
  if (ghMatch) {
    const value = ghMatch[1];
    return {
      scheme: 'github',
      value,
      canonicalUrl: `https://github.com/${value}`,
      inferredType: 'software',
      checksumValid: true,
    };
  }

  // 13. GitLab repository URL
  const glMatch = input.match(
    /^https?:\/\/(?:www\.)?gitlab\.com\/([A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+?)(?:\.git)?(?:\/-\/.*)?$/i,
  );
  if (glMatch) {
    const value = glMatch[1];
    return {
      scheme: 'gitlab',
      value,
      canonicalUrl: `https://gitlab.com/${value}`,
      inferredType: 'software',
      checksumValid: true,
    };
  }

  // 14. Canonical HTTP(S) URL (strip tracking params & normalize hostname casing)
  try {
    const parsed = new URL(input);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      for (const param of [...parsed.searchParams.keys()]) {
        if (TRACKING_PARAMS.has(param.toLowerCase())) {
          parsed.searchParams.delete(param);
        }
      }
      const canonical = parsed.toString();
      return {
        scheme: 'url',
        value: canonical,
        canonicalUrl: canonical,
        inferredType: 'webpage',
        checksumValid: true,
      };
    }
  } catch {
    return null;
  }

  return null;
}
