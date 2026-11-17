/**
 * ResearchWithME v3.4 Unified Multi-Entity Search Engine (`lib/v34/search.ts`).
 *
 * Implements Part V §6.10 & §10:
 *  - Searches across all 6 canonical types: source, contribution, tool, project, claim, topic
 *  - Supports normalized identifier detection (DOI, arXiv, GitHub URL)
 *  - Discloses explicit `matchReason` and search `mode` (`lexical` | `identifier`)
 *  - Supports transparent, user-editable query expansion terms (`expandSearchQuery`)
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { authorizedClassificationsForActor, type AuthzActor } from './authz';
import { parseSourceIdentifier } from './contracts';
import {
  getOptionalPublicSupabase,
  isStrictPersistenceMode,
  runSupabaseRpc,
} from './supabase-sync';
import {
  listClaims,
  listContributions,
  listSources,
} from './store';
import { listProjects } from './wave2-store';
import { listToolRepositories } from './wave3-store';
import { listTopics } from './wave5-store';
import type { SearchEntityType } from './wave6-contracts';

interface PostgresUnifiedSearchRow {
  id: string;
  entity_type: SearchEntityType;
  title: string;
  snippet: string | null;
  url: string;
  mode: 'lexical' | 'identifier';
  match_reason: string;
  score: number;
  integrity_status: string | null;
  access_state: string | null;
  language: string | null;
  identifiers: string[] | null;
  topics: string[] | null;
  updated_at: string | null;
}

export interface SearchHit {
  id: string;
  type: SearchEntityType;
  title: string;
  snippet: string;
  url: string;
  mode: 'lexical' | 'identifier';
  matchReason: string;
  score: number;
  integrityStatus?: string;
  accessState?: string;
  language?: string;
  identifiers: string[];
  topics: string[];
  updatedAt?: string;
}

export interface SearchResponse {
  query: string;
  mode: 'lexical' | 'identifier';
  engine?: 'postgres-fts-trigram' | 'local-lexical';
  appliedTypes: SearchEntityType[];
  appliedFilters?: {
    integrity?: string;
    access?: string;
    language?: string;
    topic?: string;
  };
  hits: SearchHit[];
  total: number;
  latencyMs: number;
}

const DOMAIN_EXPANSIONS: Array<{ triggers: string[]; terms: string[] }> = [
  {
    triggers: ['grpo', 'rl', 'reasoning', 'cold-start', 'cot'],
    terms: ['chain-of-thought', 'reinforcement learning', 'SFT', 'verification', 'ablation'],
  },
  {
    triggers: ['kv', 'pagedattention', 'vllm', 'inference', 'throughput'],
    terms: ['PagedAttention', 'continuous batching', 'GPU memory', 'serving latency'],
  },
  {
    triggers: ['retract', 'retraction', 'integrity', 'correction', 'replication'],
    terms: ['integrity event', 'reproducibility', 'provenance', 'peer review'],
  },
  {
    triggers: ['graph', 'claim', 'evidence', 'provenance'],
    terms: ['SUPPORTS', 'CONTRADICTS', 'QUALIFIES', 'locator'],
  },
];

export function expandSearchQuery(
  query: string,
  excludeTerms: string[] = [],
): {
  originalQuery: string;
  suggestedTerms: Array<{ term: string; reason: string; removable: true }>;
} {
  const lower = query.toLowerCase();
  const excluded = new Set(excludeTerms.map((t) => t.toLowerCase()));
  const seen = new Set<string>();
  const suggestedTerms: Array<{ term: string; reason: string; removable: true }> = [];

  for (const group of DOMAIN_EXPANSIONS) {
    const matchedTrigger = group.triggers.find((tr) => lower.includes(tr));
    if (!matchedTrigger) continue;
    for (const term of group.terms) {
      const norm = term.toLowerCase();
      if (lower.includes(norm) || excluded.has(norm) || seen.has(norm)) continue;
      seen.add(norm);
      suggestedTerms.push({
        term,
        reason: `Related scholarly concept for "${matchedTrigger}"`,
        removable: true,
      });
    }
  }

  return {
    originalQuery: query,
    suggestedTerms: suggestedTerms.slice(0, 8),
  };
}

function lexicalScore(
  queryTerms: string[],
  fields: Array<{ label: string; text: string; weight: number }>,
): { score: number; matchedFields: string[] } {
  let score = 0;
  const matchedFields: string[] = [];
  for (const field of fields) {
    const norm = field.text.toLowerCase();
    let fieldHits = 0;
    for (const term of queryTerms) {
      if (norm.includes(term)) {
        fieldHits += 1;
      }
    }
    if (fieldHits > 0) {
      score += fieldHits * field.weight;
      matchedFields.push(field.label);
    }
  }
  return { score, matchedFields };
}

export async function executeUnifiedSearch(options: {
  query: string;
  types?: SearchEntityType[];
  integrity?: string;
  access?: string;
  language?: string;
  topic?: string;
  actor?: AuthzActor | null;
  authorizedClassifications?: readonly string[];
  supabase?: SupabaseClient | null;
  limit?: number;
}): Promise<SearchResponse> {
  const started = performance.now();
  const rawQuery = options.query.trim();
  const allowedTypes: SearchEntityType[] = options.types?.length
    ? options.types
    : ['source', 'contribution', 'tool', 'project', 'claim', 'topic'];
  const typeSet = new Set(allowedTypes);
  const topicFilter = options.topic?.trim().toLowerCase() ?? '';
  const integrityFilter = options.integrity?.trim().toLowerCase() ?? '';
  const accessFilter = options.access?.trim().toLowerCase() ?? '';
  const languageFilter = options.language?.trim().toLowerCase() ?? '';
  const derivedClassifications = options.authorizedClassifications?.length
    ? options.authorizedClassifications
    : authorizedClassificationsForActor(options.actor ?? null);
  const allowedClassifications = new Set(
    derivedClassifications.map((c) => c.toUpperCase()),
  );

  const parsedIdentifier = rawQuery ? parseSourceIdentifier(rawQuery) : null;
  const mode: 'lexical' | 'identifier' = parsedIdentifier ? 'identifier' : 'lexical';
  const appliedFilters = {
    ...(integrityFilter ? { integrity: integrityFilter } : {}),
    ...(accessFilter ? { access: accessFilter } : {}),
    ...(languageFilter ? { language: languageFilter } : {}),
    ...(topicFilter ? { topic: topicFilter } : {}),
  };

  // Wave 17 P0: Native PostgreSQL FTS + pg_trgm + normalized identifier RPC
  const sb = options.supabase ?? getOptionalPublicSupabase();
  if (sb) {
    const remoteRows = await runSupabaseRpc<PostgresUnifiedSearchRow[]>(sb, 'v34_unified_search', {
      p_query: rawQuery,
      p_types: allowedTypes,
      p_integrity: integrityFilter || null,
      p_access: accessFilter || null,
      p_language: languageFilter || null,
      p_topic: topicFilter || null,
      p_classifications: [...allowedClassifications].map((c) => c.toLowerCase()),
      p_identifier_scheme: parsedIdentifier?.scheme ?? null,
      p_identifier_value: parsedIdentifier?.value ?? null,
      p_limit: options.limit ?? 40,
    });

    if (remoteRows !== null) {
      const pgHits: SearchHit[] = remoteRows.map((row) => ({
        id: row.id,
        type: row.entity_type,
        title: row.title,
        snippet: row.snippet ?? '',
        url: row.url,
        mode: row.mode === 'identifier' ? 'identifier' : 'lexical',
        matchReason: row.match_reason,
        score: Number(row.score ?? 1),
        ...(row.integrity_status ? { integrityStatus: row.integrity_status } : {}),
        ...(row.access_state ? { accessState: row.access_state } : {}),
        ...(row.language ? { language: row.language } : {}),
        identifiers: Array.isArray(row.identifiers) ? row.identifiers : [],
        topics: Array.isArray(row.topics) ? row.topics : [],
        ...(row.updated_at ? { updatedAt: row.updated_at } : {}),
      }));

      return {
        query: rawQuery,
        mode,
        engine: 'postgres-fts-trigram',
        appliedTypes: allowedTypes,
        appliedFilters,
        hits: pgHits,
        total: pgHits.length,
        latencyMs: Math.max(1, Math.round(performance.now() - started)),
      };
    }
  }

  // Strict persistence mode: never leak in-memory demo seeds on degraded DB reads
  if (isStrictPersistenceMode()) {
    return {
      query: rawQuery,
      mode,
      engine: 'postgres-fts-trigram',
      appliedTypes: allowedTypes,
      appliedFilters,
      hits: [],
      total: 0,
      latencyMs: Math.max(1, Math.round(performance.now() - started)),
    };
  }

  const queryTerms = rawQuery
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  const [sources, tools, projects, topics] = await Promise.all([
    typeSet.has('source') ? listSources() : Promise.resolve([]),
    typeSet.has('tool') ? listToolRepositories() : Promise.resolve([]),
    typeSet.has('project') ? listProjects() : Promise.resolve([]),
    typeSet.has('topic') ? listTopics() : Promise.resolve([]),
  ]);
  const contributions = typeSet.has('contribution') ? listContributions() : [];
  const claims = typeSet.has('claim') ? listClaims() : [];

  const hits: SearchHit[] = [];

  for (const s of sources) {
    if (integrityFilter && s.integrityStatus.toLowerCase() !== integrityFilter) continue;
    if (accessFilter && s.accessState.toLowerCase() !== accessFilter) continue;
    if (languageFilter && s.language.toLowerCase() !== languageFilter) continue;
    if (s.accessState === 'restricted' && !allowedClassifications.has('RESTRICTED')) continue;
    const ids = [s.identifierValue, s.canonicalUrl].filter((x): x is string => Boolean(x));
    const exactId =
      parsedIdentifier &&
      s.identifierScheme === parsedIdentifier.scheme &&
      s.identifierValue?.toLowerCase() === parsedIdentifier.value.toLowerCase();
    const lex = queryTerms.length
      ? lexicalScore(queryTerms, [
          { label: 'title', text: s.title, weight: 5 },
          { label: 'identifier', text: ids.join(' '), weight: 6 },
          { label: 'venue', text: s.venue ?? '', weight: 2 },
          { label: 'authors', text: s.authors.join(' '), weight: 2 },
        ])
      : { score: 1, matchedFields: ['recent'] };

    if (exactId || lex.score > 0) {
      hits.push({
        id: s.id,
        type: 'source',
        title: s.title,
        snippet: [s.venue, s.identifierValue, s.authors.slice(0, 3).join(', ')]
          .filter(Boolean)
          .join(' · '),
        url: `/source/${s.id}`,
        mode: exactId ? 'identifier' : 'lexical',
        matchReason: exactId
          ? `Exact normalized ${parsedIdentifier!.scheme.toUpperCase()} identifier match`
          : `Matched source ${lex.matchedFields.join(', ')}`,
        score: exactId ? 100 : lex.score,
        integrityStatus: s.integrityStatus,
        accessState: s.accessState,
        language: s.language,
        identifiers: ids,
        topics: [],
        updatedAt: s.updatedAt,
      });
    }
  }

  for (const c of contributions) {
    if (integrityFilter && c.trustAssessment.sourceIntegrity.toLowerCase() !== integrityFilter) {
      continue;
    }
    if (accessFilter && accessFilter !== 'open') continue;
    if (languageFilter && languageFilter !== 'en') continue;
    if (
      topicFilter &&
      !c.topics.some((t) => t.toLowerCase().includes(topicFilter)) &&
      !c.tags.some((t) => t.toLowerCase().includes(topicFilter))
    ) {
      continue;
    }
    const lex = queryTerms.length
      ? lexicalScore(queryTerms, [
          { label: 'title', text: c.title, weight: 5 },
          { label: 'summary', text: c.summary, weight: 3 },
          { label: 'topics', text: [...c.topics, ...c.tags].join(' '), weight: 3 },
          { label: 'author', text: c.authorName, weight: 2 },
        ])
      : { score: 1, matchedFields: ['recent'] };
    if (lex.score > 0) {
      hits.push({
        id: c.id,
        type: 'contribution',
        title: c.title,
        snippet: c.summary,
        url: `/contribution/${c.id}`,
        mode: 'lexical',
        matchReason: `Matched contribution ${lex.matchedFields.join(', ')}`,
        score: lex.score,
        integrityStatus: c.trustAssessment.sourceIntegrity,
        accessState: 'open',
        language: 'en',
        identifiers: c.primarySourceId ? [c.primarySourceId] : [],
        topics: c.topics,
        updatedAt: c.updatedAt,
      });
    }
  }

  for (const t of tools) {
    if (accessFilter && accessFilter !== 'open') continue;
    if (languageFilter && languageFilter !== 'en') continue;
    if (topicFilter && !t.topics.some((tp) => tp.toLowerCase().includes(topicFilter))) continue;
    const exactRepo =
      parsedIdentifier?.scheme === 'github' &&
      t.repositoryUrl.toLowerCase().includes(parsedIdentifier.value.toLowerCase());
    const lex = queryTerms.length
      ? lexicalScore(queryTerms, [
          { label: 'name', text: `${t.name} ${t.ownerName}/${t.repoName}`, weight: 5 },
          { label: 'summary', text: t.summary, weight: 3 },
          { label: 'topics', text: t.topics.join(' '), weight: 2 },
          { label: 'language', text: t.primaryLanguage ?? '', weight: 2 },
        ])
      : { score: 1, matchedFields: ['recent'] };
    if (exactRepo || lex.score > 0) {
      hits.push({
        id: t.id,
        type: 'tool',
        title: `${t.name} (${t.ownerName}/${t.repoName})`,
        snippet: t.summary,
        url: `/tools`,
        mode: exactRepo ? 'identifier' : 'lexical',
        matchReason: exactRepo
          ? 'Exact normalized GitHub repository match'
          : `Matched tool repository ${lex.matchedFields.join(', ')}`,
        score: exactRepo ? 95 : lex.score,
        integrityStatus: 'active',
        accessState: 'open',
        language: 'en',
        identifiers: [t.repositoryUrl],
        topics: t.topics,
        updatedAt: t.updatedAt,
      });
    }
  }

  for (const p of projects) {
    const projectClassification = (p.visibility === 'private' ? 'CONFIDENTIAL' : 'PUBLIC').toUpperCase();
    if (!allowedClassifications.has(projectClassification)) continue;
    if (accessFilter && accessFilter !== 'open') continue;
    if (languageFilter && languageFilter !== 'en') continue;
    const lex = queryTerms.length
      ? lexicalScore(queryTerms, [
          { label: 'title', text: p.title, weight: 5 },
          { label: 'objective', text: p.objective, weight: 3 },
        ])
      : { score: 1, matchedFields: ['recent'] };
    if (lex.score > 0) {
      hits.push({
        id: p.id,
        type: 'project',
        title: p.title,
        snippet: p.objective,
        url: `/workspaces/${p.slug}`,
        mode: 'lexical',
        matchReason: `Matched research project ${lex.matchedFields.join(', ')}`,
        score: lex.score,
        accessState: 'open',
        language: 'en',
        identifiers: [],
        topics: [],
        updatedAt: p.updatedAt,
      });
    }
  }

  for (const cl of claims) {
    if (integrityFilter && cl.assessment.sourceIntegrity.toLowerCase() !== integrityFilter) {
      continue;
    }
    if (accessFilter && accessFilter !== 'open') continue;
    if (languageFilter && languageFilter !== 'en') continue;
    const lex = queryTerms.length
      ? lexicalScore(queryTerms, [
          { label: 'statement', text: cl.statement, weight: 5 },
          { label: 'type', text: cl.claimType, weight: 2 },
        ])
      : { score: 1, matchedFields: ['recent'] };
    if (lex.score > 0) {
      hits.push({
        id: cl.id,
        type: 'claim',
        title: cl.statement,
        snippet: `Structured ${cl.claimType} claim · lifecycle: ${cl.lifecycle}`,
        url: `/claim/${cl.id}`,
        mode: 'lexical',
        matchReason: `Matched claim ${lex.matchedFields.join(', ')}`,
        score: lex.score,
        integrityStatus: cl.assessment.sourceIntegrity,
        accessState: 'open',
        language: 'en',
        identifiers: [],
        topics: [],
        updatedAt: cl.updatedAt,
      });
    }
  }

  for (const tp of topics) {
    if (accessFilter && accessFilter !== 'open') continue;
    if (languageFilter && languageFilter !== 'en') continue;
    if (topicFilter && !tp.name.toLowerCase().includes(topicFilter) && !tp.slug.includes(topicFilter)) {
      continue;
    }
    const lex = queryTerms.length
      ? lexicalScore(queryTerms, [
          { label: 'name', text: tp.name, weight: 5 },
          { label: 'slug', text: tp.slug, weight: 4 },
          { label: 'description', text: tp.description, weight: 2 },
        ])
      : { score: 1, matchedFields: ['recent'] };
    if (lex.score > 0) {
      hits.push({
        id: tp.id,
        type: 'topic',
        title: tp.name,
        snippet: tp.description || `${tp.assignmentCount} linked scholarly records`,
        url: `/topics/${tp.slug}`,
        mode: 'lexical',
        matchReason: `Matched canonical topic ${lex.matchedFields.join(', ')}`,
        score: lex.score,
        accessState: 'open',
        language: 'en',
        identifiers: [tp.slug],
        topics: [tp.name],
        updatedAt: tp.updatedAt,
      });
    }
  }

  hits.sort((a, b) => b.score - a.score || (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
  const limited = hits.slice(0, options.limit ?? 40);

  return {
    query: rawQuery,
    mode,
    engine: 'local-lexical',
    appliedTypes: allowedTypes,
    appliedFilters,
    hits: limited,
    total: hits.length,
    latencyMs: Math.max(1, Math.round(performance.now() - started)),
  };
}

// ── Part V §6.10: Fast Search Typeahead Suggestions ────────────────────────

export interface SearchSuggestionItem {
  label: string;
  type: SearchEntityType;
  url: string;
  hint: string;
}

export async function getSearchSuggestions(query: string, limit = 8): Promise<SearchSuggestionItem[]> {
  const q = query.trim();
  if (!q) {
    const topics = await listTopics();
    return topics.slice(0, limit).map((t) => ({
      label: t.name,
      type: 'topic',
      url: `/feed?topic=${encodeURIComponent(t.name)}`,
      hint: `${t.assignmentCount} linked records`,
    }));
  }
  const result = await executeUnifiedSearch({ query: q, limit });
  return result.hits.map((h) => ({
    label: h.title,
    type: h.type,
    url: h.url,
    hint: h.matchReason,
  }));
}

