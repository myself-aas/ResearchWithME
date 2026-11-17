/**
 * ResearchWithME v3.4 Canonical Research Network Repository (`lib/v34/store.ts`).
 *
 * Bridges Supabase PostgreSQL (`v34_*` tables from migration 20261117000100)
 * with a deterministic in-memory / local-dev fallback store so local runs,
 * Vitest suites, and pre-migration previews operate cleanly without requiring
 * SUPABASE_SERVICE_ROLE_KEY.
 */
import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getOptionalPublicSupabase, runSupabaseQuery } from './supabase-sync';
import { slugify } from '@/lib/validation';
import { isUuid, runSupabaseMutation } from './supabase-sync';
import {
  evaluatePublicationBlockers,
  parseSourceIdentifier,
  serializeResearchDocumentToMdx,
  type AIProvenance,
  type ContributionType,
  type PublicationBlocker,
  type ResearchDocument,
  type TrustDimensions,
} from './contracts';

// ── Domain Entities ────────────────────────────────────────────────────────

export interface SourceRecord {
  id: string;
  sourceType: 'paper' | 'preprint' | 'software' | 'dataset' | 'protocol' | 'webpage' | 'book' | 'report';
  title: string;
  authors: string[];
  publishedDate: string | null;
  venue: string | null;
  canonicalUrl: string | null;
  identifierScheme: 'doi' | 'arxiv' | 'pmid' | 'isbn' | 'swhid' | 'url' | 'github' | null;
  identifierValue: string | null;
  accessState: 'open' | 'subscription' | 'restricted' | 'unknown';
  integrityStatus: 'active' | 'corrected' | 'expression-of-concern' | 'retracted' | 'withdrawn';
  language: string;
  createdAt: string;
  updatedAt: string;
}

export interface SourceVersionRecord {
  id: string;
  sourceId: string;
  versionLabel: string;
  retrievedAt: string;
  snapshotUrl: string | null;
}

export interface IntegrityEventRecord {
  id: string;
  sourceId: string;
  sourceVersionId: string | null;
  status: SourceRecord['integrityStatus'];
  summary: string;
  noticeUrl: string | null;
  disposition: 'open' | 'acknowledged' | 'publication-blocked' | 'resolved';
  recordedBy: string | null;
  recordedAt: string;
}

export interface EvidenceRecord {
  id: string;
  sourceId: string;
  sourceVersionId: string;
  statement: string;
  quote: string | null;
  locator: { kind: string; value: string };
  extractionType: 'direct-quote' | 'paraphrase' | 'quantitative' | 'table-figure' | 'code-artifact' | 'inferred';
  limitation: string | null;
  assessment: TrustDimensions;
  objectVersion: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimRecord {
  id: string;
  claimType: 'empirical' | 'methodological' | 'causal' | 'comparative' | 'normative' | 'replication';
  statement: string;
  lifecycle: 'draft' | 'active' | 'under-review' | 'validated' | 'published' | 'superseded' | 'withdrawn' | 'archived';
  assessment: TrustDimensions;
  objectVersion: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimEvidenceLink {
  claimId: string;
  evidenceId: string;
  relationship: 'SUPPORTS' | 'CONTRADICTS' | 'QUALIFIES';
  assertionMethod: 'MANUAL' | 'AI_SUGGESTED' | 'IMPORTED';
  confidence: number | null;
  rationale: string | null;
  status: 'PROPOSED' | 'ACCEPTED' | 'REJECTED';
  assertedBy: string | null;
  createdAt: string;
}

export interface ContributionRecord {
  id: string;
  slug: string;
  authorId: string | null;
  authorHandle: string;
  authorName: string;
  contributionType: ContributionType;
  title: string;
  subtitle: string | null;
  summary: string;
  document: ResearchDocument;
  mdx: string;
  primarySourceId: string | null;
  primarySourceVersionId: string | null;
  topics: string[];
  tags: string[];
  limitations: string[];
  trustAssessment: TrustDimensions;
  aiProvenance: AIProvenance | null;
  lifecycle: 'draft' | 'active' | 'under-review' | 'validated' | 'published' | 'superseded' | 'withdrawn' | 'archived';
  version: number;
  evidenceIds: string[];
  claimIds: string[];
  recognition: {
    helpfulReviews: number;
    referenced: number;
    saved: number;
    evidenceUsed: number;
    replications: number;
  };
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServerDraftRecord {
  id: string;
  authorId: string;
  contributionType: ContributionType;
  title: string;
  document: ResearchDocument;
  mdx: string;
  version: number;
  lastMutationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServerDraftSnapshot {
  id: string;
  draftId: string;
  version: number;
  document: ResearchDocument;
  reason: 'interval' | 'manual' | 'pre-publish' | 'conflict';
  createdAt: string;
}

export interface LibraryItemRecord {
  id: string;
  userId: string;
  itemType: 'contribution' | 'article' | 'source' | 'evidence' | 'claim' | 'tool';
  itemId: string;
  title: string;
  url: string;
  collection: string;
  note: string | null;
  createdAt: string;
}

export interface ResearchGoalRecord {
  id: string;
  userId: string;
  title: string;
  metric:
    | 'SOURCES_REVIEWED'
    | 'CONTRIBUTIONS_PUBLISHED'
    | 'REVIEWS_COMPLETED'
    | 'EVIDENCE_ATTACHED'
    | 'CITATIONS_RESOLVED'
    | 'MILESTONES_COMPLETED'
    | 'REPLICATIONS_DOCUMENTED'
    | 'CUSTOM';
  targetValue: number;
  currentValue: number;
  period: 'ONE_TIME' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'CUSTOM';
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'EXPIRED' | 'ARCHIVED';
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Seeded Canonical Records (used when Supabase v34 tables are not yet populated) ─

interface V34MemoryState {
  sources: Map<string, SourceRecord>;
  sourceVersions: Map<string, SourceVersionRecord>;
  integrityEvents: Map<string, IntegrityEventRecord[]>;
  evidence: Map<string, EvidenceRecord>;
  claims: Map<string, ClaimRecord>;
  claimEvidence: ClaimEvidenceLink[];
  contributions: Map<string, ContributionRecord>;
  drafts: Map<string, ServerDraftRecord>;
  draftSnapshots: Map<string, ServerDraftSnapshot[]>;
  idempotency: Map<string, { draftId: string; version: number; payload: Record<string, unknown> }>;
  library: Map<string, LibraryItemRecord[]>;
  goals: Map<string, ResearchGoalRecord[]>;
}

const DEFAULT_TRUST: TrustDimensions = {
  review: 'editorially-reviewed',
  replication: 'partially-replicated',
  certainty: 'moderate',
  consensus: 'emerging',
  sourceIntegrity: 'active',
  method: 'Structured source & locator verification',
};

function createSeedState(): V34MemoryState {
  const now = '2026-11-16T12:00:00.000Z';

  const sources = new Map<string, SourceRecord>([
    [
      'src-arxiv-2501-12948',
      {
        id: 'src-arxiv-2501-12948',
        sourceType: 'preprint',
        title: 'DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning',
        authors: ['DeepSeek-AI Research Team'],
        publishedDate: '2025-01-22',
        venue: 'arXiv cs.CL',
        canonicalUrl: 'https://arxiv.org/abs/2501.12948',
        identifierScheme: 'arxiv',
        identifierValue: '2501.12948',
        accessState: 'open',
        integrityStatus: 'active',
        language: 'en',
        createdAt: now,
        updatedAt: now,
      },
    ],
    [
      'src-github-vllm',
      {
        id: 'src-github-vllm',
        sourceType: 'software',
        title: 'vLLM: Easy, Fast, and Cheap LLM Serving with PagedAttention',
        authors: ['vLLM Project Contributors'],
        publishedDate: '2026-09-10',
        venue: 'GitHub Open-Source Repository',
        canonicalUrl: 'https://github.com/vllm-project/vllm',
        identifierScheme: 'github',
        identifierValue: 'vllm-project/vllm',
        accessState: 'open',
        integrityStatus: 'active',
        language: 'en',
        createdAt: now,
        updatedAt: now,
      },
    ],
  ]);

  const sourceVersions = new Map<string, SourceVersionRecord>([
    [
      'sv-arxiv-2501-12948-v1',
      {
        id: 'sv-arxiv-2501-12948-v1',
        sourceId: 'src-arxiv-2501-12948',
        versionLabel: 'v1',
        retrievedAt: now,
        snapshotUrl: 'https://arxiv.org/abs/2501.12948v1',
      },
    ],
    [
      'sv-github-vllm-v06',
      {
        id: 'sv-github-vllm-v06',
        sourceId: 'src-github-vllm',
        versionLabel: 'v0.6',
        retrievedAt: now,
        snapshotUrl: 'https://github.com/vllm-project/vllm/releases',
      },
    ],
  ]);

  const evidence = new Map<string, EvidenceRecord>([
    [
      'ev-grpo-emergence',
      {
        id: 'ev-grpo-emergence',
        sourceId: 'src-arxiv-2501-12948',
        sourceVersionId: 'sv-arxiv-2501-12948-v1',
        statement:
          'Pure reinforcement learning without supervised fine-tuning (DeepSeek-R1-Zero) raises AIME 2024 pass@1 from 15.6% to 71.0%, though with readability and language-mixing artifacts.',
        quote: 'Pass@1 score on AIME 2024 increases from 15.6% to 71.0% during pure RL training.',
        locator: { kind: 'section', value: 'Section 2.2 · Figure 2 & Table 1' },
        extractionType: 'quantitative',
        limitation: 'Evaluated on math/coding benchmarks; general-domain calibration requires cold-start SFT.',
        assessment: DEFAULT_TRUST,
        objectVersion: 1,
        createdBy: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
    [
      'ev-paged-kv-memory',
      {
        id: 'ev-paged-kv-memory',
        sourceId: 'src-github-vllm',
        sourceVersionId: 'sv-github-vllm-v06',
        statement:
          'Block-level KV cache paging eliminates internal memory fragmentation below 4%, sustaining higher concurrent batch throughput under variable prompt lengths.',
        quote: null,
        locator: { kind: 'section', value: 'vllm/core/block_manager.py & benchmark docs' },
        extractionType: 'code-artifact',
        limitation: 'Throughput gains narrow on uniform short-context workloads bound by compute rather than VRAM.',
        assessment: {
          ...DEFAULT_TRUST,
          replication: 'replicated',
          consensus: 'broad',
        },
        objectVersion: 1,
        createdBy: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
  ]);

  const claims = new Map<string, ClaimRecord>([
    [
      'clm-rl-reasoning-tradeoff',
      {
        id: 'clm-rl-reasoning-tradeoff',
        claimType: 'empirical',
        statement:
          'Rule-based RL alone elicits chain-of-thought verification behaviors in large base models, but cold-start SFT remains necessary for readable multi-domain outputs.',
        lifecycle: 'active',
        assessment: DEFAULT_TRUST,
        objectVersion: 1,
        createdBy: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
    [
      'clm-paged-attention-utilization',
      {
        id: 'clm-paged-attention-utilization',
        claimType: 'comparative',
        statement:
          'Paged KV-cache allocation materially increases serving throughput on heterogeneous long-context batches compared to contiguous pre-allocation.',
        lifecycle: 'validated',
        assessment: {
          ...DEFAULT_TRUST,
          replication: 'replicated',
          consensus: 'broad',
        },
        objectVersion: 1,
        createdBy: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
  ]);

  const claimEvidence: ClaimEvidenceLink[] = [
    {
      claimId: 'clm-rl-reasoning-tradeoff',
      evidenceId: 'ev-grpo-emergence',
      relationship: 'SUPPORTS',
      assertionMethod: 'MANUAL',
      confidence: 0.9,
      rationale: 'Directly supported by AIME 2024 pass@1 progression and readability ablation notes.',
      status: 'ACCEPTED',
      assertedBy: null,
      createdAt: now,
    },
    {
      claimId: 'clm-paged-attention-utilization',
      evidenceId: 'ev-paged-kv-memory',
      relationship: 'SUPPORTS',
      assertionMethod: 'MANUAL',
      confidence: 0.95,
      rationale: 'Verified in block manager implementation and reproducible serving benchmarks.',
      status: 'ACCEPTED',
      assertedBy: null,
      createdAt: now,
    },
    {
      claimId: 'clm-rl-reasoning-tradeoff',
      evidenceId: 'ev-paged-kv-memory',
      relationship: 'QUALIFIES',
      assertionMethod: 'AI_SUGGESTED',
      confidence: 0.62,
      rationale:
        'AI suggested: Long chain-of-thought rollouts during pure RL evaluation amplify KV-cache memory pressure, qualifying deployment throughput.',
      status: 'PROPOSED',
      assertedBy: null,
      createdAt: now,
    },
  ];

  const doc1: ResearchDocument = {
    schemaVersion: '1.0',
    id: 'contrib-rl-cold-start',
    title: 'Pure RL vs. Cold-Start SFT in Open Reasoning Models: Where Readability Breaks',
    authorId: 'myself-aas',
    workspaceId: 'public',
    version: 1,
    createdAt: now,
    updatedAt: now,
    blocks: [
      {
        id: 'b-1',
        type: 'paragraph',
        text: 'DeepSeek-R1-Zero shows that outcome-based reinforcement learning can elicit self-verification without supervised reasoning traces. However, inspecting the reported failure modes makes clear why cold-start curation still matters in practice.',
      },
      {
        id: 'b-2',
        type: 'evidence',
        text: 'AIME 2024 pass@1 climbed from 15.6% to 71.0% under pure GRPO, while outputs suffered from language mixing and dense unformatted traces.',
        sourceId: 'src-arxiv-2501-12948',
        sourceVersionId: 'sv-arxiv-2501-12948-v1',
        locator: 'Section 2.2 · Figure 2 & Table 1',
        limitation: 'Math benchmark gains do not automatically translate to open-ended writing coherence.',
      },
      {
        id: 'b-3',
        type: 'limitation',
        text: 'Independent reproduction at 671B scale remains compute-constrained; most community replications test 7B–32B distilled checkpoints rather than full-scale GRPO.',
      },
    ],
  };

  const doc2: ResearchDocument = {
    schemaVersion: '1.0',
    id: 'contrib-vllm-paged-review',
    title: 'Tool Review: vLLM Block Manager Under Heterogeneous Research Workloads',
    authorId: 'myself-aas',
    workspaceId: 'public',
    version: 1,
    createdAt: now,
    updatedAt: now,
    blocks: [
      {
        id: 'b-10',
        type: 'paragraph',
        text: 'Evaluating vLLM on mixed literature-synthesis prompts (512 to 16,384 tokens) confirms that non-contiguous KV cache blocks prevent the worst OOM failures seen in naive static batching.',
      },
      {
        id: 'b-11',
        type: 'evidence',
        text: 'Internal KV cache waste stayed under 4% across mixed-length evaluation batches.',
        sourceId: 'src-github-vllm',
        sourceVersionId: 'sv-github-vllm-v06',
        locator: 'vllm/core/block_manager.py',
        limitation: 'Requires careful swap-space sizing when enabling prefix caching alongside LoRA adapters.',
      },
    ],
  };

  const contributions = new Map<string, ContributionRecord>([
    [
      'contrib-rl-cold-start',
      {
        id: 'contrib-rl-cold-start',
        slug: 'pure-rl-vs-cold-start-sft-reasoning-models',
        authorId: null,
        authorHandle: 'myself-aas',
        authorName: 'Ashif Ahmed Shuvo',
        contributionType: 'paper-review',
        title: doc1.title,
        subtitle: 'Structured paper review with explicit source locators and replication limits',
        summary:
          'Examines the empirical tradeoff between pure RL reasoning emergence and cold-start supervised formatting in DeepSeek-R1, separating verified benchmark lifts from unverified generalization claims.',
        document: doc1,
        mdx: serializeResearchDocumentToMdx(doc1),
        primarySourceId: 'src-arxiv-2501-12948',
        primarySourceVersionId: 'sv-arxiv-2501-12948-v1',
        topics: ['Machine Learning', 'Reasoning Models', 'Reproducibility'],
        tags: ['rl', 'reasoning', 'grpo', 'llm'],
        limitations: [
          'Full 671B training run not independently reproduced due to compute requirements.',
        ],
        trustAssessment: DEFAULT_TRUST,
        aiProvenance: {
          usedAi: false,
          operation: 'none',
          humanReviewed: true,
          humanReviewer: 'Ashif Ahmed Shuvo',
          syntheticDisclosed: true,
        },
        lifecycle: 'published',
        version: 1,
        evidenceIds: ['ev-grpo-emergence'],
        claimIds: ['clm-rl-reasoning-tradeoff'],
        recognition: {
          helpfulReviews: 14,
          referenced: 6,
          saved: 23,
          evidenceUsed: 5,
          replications: 2,
        },
        publishedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ],
    [
      'contrib-vllm-paged-review',
      {
        id: 'contrib-vllm-paged-review',
        slug: 'tool-review-vllm-block-manager-research-workloads',
        authorId: null,
        authorHandle: 'myself-aas',
        authorName: 'Ashif Ahmed Shuvo',
        contributionType: 'tool-review',
        title: doc2.title,
        subtitle: 'Hands-on systems evaluation of open-source inference serving',
        summary:
          'Benchmarks vLLM’s paged KV cache on variable-length scholarly RAG workloads, detailing VRAM savings, prefix-caching behavior, and operational tradeoffs.',
        document: doc2,
        mdx: serializeResearchDocumentToMdx(doc2),
        primarySourceId: 'src-github-vllm',
        primarySourceVersionId: 'sv-github-vllm-v06',
        topics: ['Systems', 'Open-Source Tools', 'LLM Inference'],
        tags: ['vllm', 'paged-attention', 'inference'],
        limitations: [
          'Tested on single-node A100/H100 configurations; multi-node pipeline parallel behavior not evaluated.',
        ],
        trustAssessment: {
          ...DEFAULT_TRUST,
          replication: 'replicated',
          consensus: 'broad',
        },
        aiProvenance: {
          usedAi: false,
          operation: 'none',
          humanReviewed: true,
          humanReviewer: 'Ashif Ahmed Shuvo',
          syntheticDisclosed: true,
        },
        lifecycle: 'published',
        version: 1,
        evidenceIds: ['ev-paged-kv-memory'],
        claimIds: ['clm-paged-attention-utilization'],
        recognition: {
          helpfulReviews: 11,
          referenced: 4,
          saved: 19,
          evidenceUsed: 3,
          replications: 4,
        },
        publishedAt: '2026-11-15T15:00:00.000Z',
        createdAt: '2026-11-15T15:00:00.000Z',
        updatedAt: '2026-11-15T15:00:00.000Z',
      },
    ],
  ]);

  const goals = new Map<string, ResearchGoalRecord[]>([
    [
      'default',
      [
        {
          id: 'goal-weekly-sources',
          userId: 'default',
          title: 'Review 3 primary sources with exact locators',
          metric: 'SOURCES_REVIEWED',
          targetValue: 3,
          currentValue: 2,
          period: 'WEEKLY',
          status: 'ACTIVE',
          dueAt: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'goal-monthly-contrib',
          userId: 'default',
          title: 'Publish 2 evidence-linked contributions',
          metric: 'CONTRIBUTIONS_PUBLISHED',
          targetValue: 2,
          currentValue: 1,
          period: 'MONTHLY',
          status: 'ACTIVE',
          dueAt: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    ],
  ]);

  return {
    sources,
    sourceVersions,
    integrityEvents: new Map(),
    evidence,
    claims,
    claimEvidence,
    contributions,
    drafts: new Map(),
    draftSnapshots: new Map(),
    idempotency: new Map(),
    library: new Map(),
    goals,
  };
}

let state: V34MemoryState = createSeedState();

export function resetV34StoreForTesting() {
  state = createSeedState();
}

function makeId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(6).toString('hex')}`;
}

/** Optional best-effort sync to Supabase when v34 tables exist in the remote DB. */
async function trySupabasePublicRead<T>(
  query: (client: SupabaseClient) => PromiseLike<{ data: T | null; error: { message: string } | null }>,
): Promise<T | null> {
  if (!isSupabaseConfigured) return null;
  return runSupabaseQuery<T>(getOptionalPublicSupabase(), query);
}

// ── Sources & Integrity ────────────────────────────────────────────────────

export async function listSources(): Promise<SourceRecord[]> {
  const remote = await trySupabasePublicRead<Record<string, unknown>[]>((sb) =>
    sb.from('v34_sources').select('*').order('updated_at', { ascending: false }).limit(50),
  );
  const byId = new Map<string, SourceRecord>(state.sources);
  if (remote) {
    for (const row of remote) {
      const mapped = mapRemoteSource(row);
      byId.set(mapped.id, mapped);
    }
  }
  return [...byId.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function mapRemoteSource(row: Record<string, unknown>): SourceRecord {
  return {
    id: String(row.id),
    sourceType: (row.source_type as SourceRecord['sourceType']) ?? 'paper',
    title: String(row.title ?? 'Untitled source'),
    authors: Array.isArray(row.authors) ? row.authors.map(String) : [],
    publishedDate: typeof row.published_date === 'string' ? row.published_date : null,
    venue: typeof row.venue === 'string' ? row.venue : null,
    canonicalUrl: typeof row.canonical_url === 'string' ? row.canonical_url : null,
    identifierScheme: (row.identifier_scheme as SourceRecord['identifierScheme']) ?? null,
    identifierValue: typeof row.identifier_value === 'string' ? row.identifier_value : null,
    accessState: (row.access_state as SourceRecord['accessState']) ?? 'open',
    integrityStatus: (row.integrity_status as SourceRecord['integrityStatus']) ?? 'active',
    language: typeof row.language === 'string' ? row.language : 'en',
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

export async function getSourceWithDetails(id: string): Promise<{
  source: SourceRecord;
  versions: SourceVersionRecord[];
  integrityEvents: IntegrityEventRecord[];
  evidence: EvidenceRecord[];
  contributions: ContributionRecord[];
} | null> {
  const local = state.sources.get(id);
  let source = local ?? null;

  if (!source) {
    const remote = await trySupabasePublicRead<Record<string, unknown>>((sb) =>
      sb.from('v34_sources').select('*').eq('id', id).maybeSingle(),
    );
    if (remote) source = mapRemoteSource(remote);
  }
  if (!source) return null;

  const versions = [...state.sourceVersions.values()].filter((v) => v.sourceId === source.id);
  const integrityEvents = state.integrityEvents.get(source.id) ?? [];
  const evidence = [...state.evidence.values()].filter((e) => e.sourceId === source.id);
  const contributions = [...state.contributions.values()].filter(
    (c) => c.lifecycle === 'published' && (c.primarySourceId === source.id || evidence.some((e) => c.evidenceIds.includes(e.id))),
  );

  return { source, versions, integrityEvents, evidence, contributions };
}

export async function resolveOrCreateSource(input: {
  query: string;
  title?: string;
  authors?: string[];
  venue?: string;
  publishedDate?: string;
  sourceType?: SourceRecord['sourceType'];
  userId?: string | null;
  supabase?: SupabaseClient;
}): Promise<{ source: SourceRecord; version: SourceVersionRecord; created: boolean }> {
  const parsed = parseSourceIdentifier(input.query);
  const now = new Date().toISOString();

  if (parsed) {
    for (const existing of state.sources.values()) {
      if (
        existing.identifierScheme === parsed.scheme &&
        existing.identifierValue?.toLowerCase() === parsed.value.toLowerCase()
      ) {
        const version =
          [...state.sourceVersions.values()].find((v) => v.sourceId === existing.id) ?? {
            id: `${existing.id}-v1`,
            sourceId: existing.id,
            versionLabel: 'v1',
            retrievedAt: now,
            snapshotUrl: existing.canonicalUrl,
          };
        state.sourceVersions.set(version.id, version);
        return { source: existing, version, created: false };
      }
    }
  }

  const id = parsed
    ? `src-${parsed.scheme}-${slugify(parsed.value).slice(0, 48)}`
    : makeId('src');
  const source: SourceRecord = {
    id,
    sourceType: input.sourceType ?? parsed?.inferredType ?? 'paper',
    title:
      input.title?.trim() ||
      (parsed ? `${parsed.scheme.toUpperCase()}: ${parsed.value}` : input.query.trim()),
    authors: input.authors?.length ? input.authors : ['Unverified author list'],
    publishedDate: input.publishedDate ?? null,
    venue: input.venue ?? (parsed?.scheme === 'arxiv' ? 'arXiv' : parsed?.scheme === 'github' ? 'GitHub' : null),
    canonicalUrl: parsed?.canonicalUrl ?? null,
    identifierScheme: parsed?.scheme ?? null,
    identifierValue: parsed?.value ?? null,
    accessState: 'open',
    integrityStatus: 'active',
    language: 'en',
    createdAt: now,
    updatedAt: now,
  };
  const version: SourceVersionRecord = {
    id: `sv-${id}-v1`,
    sourceId: source.id,
    versionLabel: 'v1',
    retrievedAt: now,
    snapshotUrl: source.canonicalUrl,
  };

  state.sources.set(source.id, source);
  state.sourceVersions.set(version.id, version);

  if (input.supabase && input.userId) {
    try {
      await input.supabase.from('v34_sources').upsert({
        id: source.id,
        source_type: source.sourceType,
        title: source.title,
        authors: source.authors,
        published_date: source.publishedDate,
        venue: source.venue,
        canonical_url: source.canonicalUrl,
        identifier_scheme: source.identifierScheme,
        identifier_value: source.identifierValue,
        access_state: source.accessState,
        integrity_status: source.integrityStatus,
        created_by: input.userId,
      });
      await input.supabase.from('v34_source_versions').upsert({
        id: version.id,
        source_id: source.id,
        version_label: version.versionLabel,
        snapshot_url: version.snapshotUrl,
      });
    } catch {
      // Fall back to in-memory state if remote table is not yet migrated.
    }
  }

  return { source, version, created: true };
}

export async function recordIntegrityEvent(input: {
  sourceId: string;
  status: SourceRecord['integrityStatus'];
  summary: string;
  noticeUrl?: string;
  disposition: IntegrityEventRecord['disposition'];
  recordedBy: string;
  supabase?: SupabaseClient;
}): Promise<{
  event: IntegrityEventRecord;
  source: SourceRecord;
  affectedEvidenceIds: string[];
  affectedContributionIds: string[];
  affectedAuthorIds: string[];
} | null> {
  const source = state.sources.get(input.sourceId);
  if (!source) return null;

  const now = new Date().toISOString();
  const latestVersion = [...state.sourceVersions.values()].find((v) => v.sourceId === source.id);
  const event: IntegrityEventRecord = {
    id: makeId('ie'),
    sourceId: source.id,
    sourceVersionId: latestVersion?.id ?? null,
    status: input.status,
    summary: input.summary,
    noticeUrl: input.noticeUrl ?? null,
    disposition: input.disposition,
    recordedBy: input.recordedBy,
    recordedAt: now,
  };

  const list = state.integrityEvents.get(source.id) ?? [];
  list.unshift(event);
  state.integrityEvents.set(source.id, list);

  // Propagate integrity status immediately to source & dependent evidence/contributions.
  const updatedSource: SourceRecord = {
    ...source,
    integrityStatus: input.status,
    updatedAt: now,
  };
  state.sources.set(source.id, updatedSource);

  const affectedEvidenceIds: string[] = [];
  for (const [evId, ev] of state.evidence.entries()) {
    if (ev.sourceId === source.id) {
      affectedEvidenceIds.push(evId);
      state.evidence.set(evId, {
        ...ev,
        assessment: { ...ev.assessment, sourceIntegrity: input.status },
        updatedAt: now,
      });
    }
  }
  const affectedContributionIds: string[] = [];
  const affectedAuthorIds = new Set<string>();
  for (const [cId, contrib] of state.contributions.entries()) {
    if (contrib.primarySourceId === source.id) {
      affectedContributionIds.push(cId);
      if (contrib.authorId) affectedAuthorIds.add(contrib.authorId);
      state.contributions.set(cId, {
        ...contrib,
        trustAssessment: { ...contrib.trustAssessment, sourceIntegrity: input.status },
        updatedAt: now,
      });
    }
  }

  if (input.supabase) {
    try {
      await input.supabase.from('v34_integrity_events').insert({
        id: event.id,
        source_id: event.sourceId,
        source_version_id: event.sourceVersionId,
        status: event.status,
        summary: event.summary,
        notice_url: event.noticeUrl,
        disposition: event.disposition,
        recorded_by: event.recordedBy,
      });
    } catch {
      // Best effort remote sync.
    }
  }

  return {
    event,
    source: updatedSource,
    affectedEvidenceIds,
    affectedContributionIds,
    affectedAuthorIds: [...affectedAuthorIds],
  };
}

// ── Evidence, Claims & Explicit Relationships ──────────────────────────────

export function listEvidence(sourceId?: string): EvidenceRecord[] {
  const all = [...state.evidence.values()];
  return sourceId ? all.filter((e) => e.sourceId === sourceId) : all;
}

export function createEvidence(input: {
  sourceId: string;
  sourceVersionId: string;
  statement: string;
  quote?: string;
  locator: { kind: string; value: string };
  extractionType: EvidenceRecord['extractionType'];
  limitation?: string;
  assessment?: TrustDimensions;
  createdBy: string | null;
}): { ok: true; evidence: EvidenceRecord } | { ok: false; message: string } {
  const source = state.sources.get(input.sourceId);
  const version = state.sourceVersions.get(input.sourceVersionId);
  if (!source || !version || version.sourceId !== source.id) {
    return { ok: false, message: 'Evidence must reference an existing canonical source and source version.' };
  }
  const now = new Date().toISOString();
  const record: EvidenceRecord = {
    id: makeId('ev'),
    sourceId: source.id,
    sourceVersionId: version.id,
    statement: input.statement,
    quote: input.quote ?? null,
    locator: input.locator,
    extractionType: input.extractionType,
    limitation: input.limitation ?? null,
    assessment: input.assessment ?? {
      ...DEFAULT_TRUST,
      review: 'not-reviewed',
      sourceIntegrity: source.integrityStatus,
    },
    objectVersion: 1,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  };
  state.evidence.set(record.id, record);
  return { ok: true, evidence: record };
}

export function updateEvidence(
  id: string,
  patch: { statement?: string; quote?: string; limitation?: string; assessment?: TrustDimensions },
): EvidenceRecord | null {
  const existing = state.evidence.get(id);
  if (!existing) return null;
  const updated: EvidenceRecord = {
    ...existing,
    statement: patch.statement ?? existing.statement,
    quote: patch.quote !== undefined ? patch.quote : existing.quote,
    limitation: patch.limitation !== undefined ? patch.limitation : existing.limitation,
    assessment: patch.assessment ?? existing.assessment,
    objectVersion: existing.objectVersion + 1,
    updatedAt: new Date().toISOString(),
  };
  state.evidence.set(id, updated);
  return updated;
}

export function listClaims(): ClaimRecord[] {
  return [...state.claims.values()];
}

export function createClaim(input: {
  claimType: ClaimRecord['claimType'];
  statement: string;
  assessment?: TrustDimensions;
  createdBy: string | null;
}): ClaimRecord {
  const now = new Date().toISOString();
  const claim: ClaimRecord = {
    id: makeId('clm'),
    claimType: input.claimType,
    statement: input.statement,
    lifecycle: 'active',
    assessment: input.assessment ?? { ...DEFAULT_TRUST, review: 'not-reviewed' },
    objectVersion: 1,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  };
  state.claims.set(claim.id, claim);
  return claim;
}

export function linkClaimEvidence(input: {
  claimId: string;
  evidenceId: string;
  relationship: 'SUPPORTS' | 'CONTRADICTS' | 'QUALIFIES';
  assertionMethod: 'MANUAL' | 'AI_SUGGESTED' | 'IMPORTED';
  confidence?: number;
  rationale?: string;
  assertedBy: string | null;
}): { ok: true; link: ClaimEvidenceLink } | { ok: false; message: string } {
  if (!state.claims.has(input.claimId)) return { ok: false, message: 'Claim not found.' };
  if (!state.evidence.has(input.evidenceId)) return { ok: false, message: 'Evidence not found.' };

  // Acceptance Criterion E: AI-suggested relationships stay PROPOSED until accepted by a human.
  const status: ClaimEvidenceLink['status'] =
    input.assertionMethod === 'AI_SUGGESTED' ? 'PROPOSED' : 'ACCEPTED';

  const link: ClaimEvidenceLink = {
    claimId: input.claimId,
    evidenceId: input.evidenceId,
    relationship: input.relationship,
    assertionMethod: input.assertionMethod,
    confidence: input.confidence ?? null,
    rationale: input.rationale ?? null,
    status,
    assertedBy: input.assertedBy,
    createdAt: new Date().toISOString(),
  };
  const idx = state.claimEvidence.findIndex(
    (item) =>
      item.claimId === link.claimId &&
      item.evidenceId === link.evidenceId &&
      item.relationship === link.relationship,
  );
  if (idx >= 0) state.claimEvidence[idx] = link;
  else state.claimEvidence.push(link);

  return { ok: true, link };
}

export function linkContributionObject(
  contributionId: string,
  target: { evidenceId: string } | { claimId: string },
): { ok: true; contribution: ContributionRecord } | { ok: false; message: string } {
  const contribution = state.contributions.get(contributionId);
  if (!contribution) return { ok: false, message: 'Contribution not found.' };

  if ('evidenceId' in target) {
    if (!state.evidence.has(target.evidenceId)) return { ok: false, message: 'Evidence not found.' };
    if (!contribution.evidenceIds.includes(target.evidenceId)) {
      contribution.evidenceIds = [...contribution.evidenceIds, target.evidenceId];
    }
  } else {
    if (!state.claims.has(target.claimId)) return { ok: false, message: 'Claim not found.' };
    if (!contribution.claimIds.includes(target.claimId)) {
      contribution.claimIds = [...contribution.claimIds, target.claimId];
    }
  }
  contribution.updatedAt = new Date().toISOString();
  state.contributions.set(contribution.id, contribution);
  return { ok: true, contribution };
}

export function getClaimEvidenceLinks(claimId?: string): ClaimEvidenceLink[] {
  return claimId
    ? state.claimEvidence.filter((l) => l.claimId === claimId)
    : [...state.claimEvidence];
}

export function updateClaimEvidenceStatus(input: {
  claimId: string;
  evidenceId: string;
  relationship: 'SUPPORTS' | 'CONTRADICTS' | 'QUALIFIES';
  status: 'ACCEPTED' | 'REJECTED';
  rationale?: string;
}): { ok: true; link: ClaimEvidenceLink } | { ok: false; message: string } {
  const idx = state.claimEvidence.findIndex(
    (item) =>
      item.claimId === input.claimId &&
      item.evidenceId === input.evidenceId &&
      item.relationship === input.relationship,
  );
  if (idx < 0) {
    return { ok: false, message: 'Claim–evidence relationship not found.' };
  }
  const existing = state.claimEvidence[idx];
  const updated: ClaimEvidenceLink = {
    ...existing,
    status: input.status,
    rationale: input.rationale ?? existing.rationale,
  };
  state.claimEvidence[idx] = updated;
  return { ok: true, link: updated };
}

// ── Live Supabase Write-Through Helpers (RLS-enforced, zero service role) ──

export async function persistEvidenceToSupabase(
  supabase: SupabaseClient | null | undefined,
  record: EvidenceRecord,
): Promise<boolean> {
  if (!supabase) return false;
  return runSupabaseMutation(supabase, (sb) =>
    sb.from('v34_evidence').upsert({
      id: record.id,
      source_id: record.sourceId,
      source_version_id: record.sourceVersionId,
      statement: record.statement,
      quote: record.quote,
      locator: record.locator,
      extraction_type: record.extractionType,
      limitation: record.limitation,
      assessment: record.assessment,
      object_version: record.objectVersion,
      created_by: isUuid(record.createdBy) ? record.createdBy : null,
    }),
  );
}

export async function persistClaimToSupabase(
  supabase: SupabaseClient | null | undefined,
  claim: ClaimRecord,
): Promise<boolean> {
  if (!supabase) return false;
  return runSupabaseMutation(supabase, (sb) =>
    sb.from('v34_claims').upsert({
      id: claim.id,
      claim_type: claim.claimType,
      statement: claim.statement,
      lifecycle: claim.lifecycle,
      assessment: claim.assessment,
      object_version: claim.objectVersion,
      created_by: isUuid(claim.createdBy) ? claim.createdBy : null,
    }),
  );
}

export async function persistClaimEvidenceToSupabase(
  supabase: SupabaseClient | null | undefined,
  link: ClaimEvidenceLink,
): Promise<boolean> {
  if (!supabase) return false;
  return runSupabaseMutation(supabase, (sb) =>
    sb.from('v34_claim_evidence').upsert({
      claim_id: link.claimId,
      evidence_id: link.evidenceId,
      relationship: link.relationship,
      assertion_method: link.assertionMethod,
      confidence: link.confidence,
      rationale: link.rationale,
      status: link.status,
      asserted_by: isUuid(link.assertedBy) ? link.assertedBy : null,
    }),
  );
}

export async function persistContributionToSupabase(
  supabase: SupabaseClient | null | undefined,
  contrib: ContributionRecord,
): Promise<boolean> {
  if (!supabase) return false;
  return runSupabaseMutation(supabase, (sb) =>
    sb.from('v34_contributions').upsert({
      id: contrib.id,
      slug: contrib.slug,
      author_id: isUuid(contrib.authorId) ? contrib.authorId : null,
      author_handle: contrib.authorHandle,
      author_name: contrib.authorName,
      contribution_type: contrib.contributionType,
      title: contrib.title,
      subtitle: contrib.subtitle,
      summary: contrib.summary,
      document: contrib.document,
      mdx: contrib.mdx,
      primary_source_id: contrib.primarySourceId,
      primary_source_version_id: contrib.primarySourceVersionId,
      topics: contrib.topics,
      tags: contrib.tags,
      limitations: contrib.limitations,
      trust_assessment: contrib.trustAssessment,
      ai_provenance: contrib.aiProvenance,
      lifecycle: contrib.lifecycle,
      version: contrib.version,
      published_at: contrib.publishedAt,
    }),
  );
}

export async function persistDraftToSupabase(
  supabase: SupabaseClient | null | undefined,
  draft: ServerDraftRecord,
): Promise<boolean> {
  if (!supabase || !isUuid(draft.authorId)) return false;
  return runSupabaseMutation(supabase, (sb) =>
    sb.from('v34_drafts').upsert({
      id: draft.id,
      author_id: draft.authorId,
      contribution_type: draft.contributionType,
      title: draft.title,
      document: draft.document,
      mdx: draft.mdx,
      version: draft.version,
      last_mutation_id: draft.lastMutationId,
    }),
  );
}

export async function persistLibraryItemToSupabase(
  supabase: SupabaseClient | null | undefined,
  item: LibraryItemRecord,
): Promise<boolean> {
  if (!supabase || !isUuid(item.userId)) return false;
  return runSupabaseMutation(supabase, (sb) =>
    sb.from('v34_library_items').upsert({
      id: item.id,
      user_id: item.userId,
      item_type: item.itemType,
      item_id: item.itemId,
      title: item.title,
      url: item.url,
      collection: item.collection,
      note: item.note,
    }),
  );
}

export async function persistResearchGoalToSupabase(
  supabase: SupabaseClient | null | undefined,
  goal: ResearchGoalRecord,
): Promise<boolean> {
  if (!supabase || !isUuid(goal.userId)) return false;
  return runSupabaseMutation(supabase, (sb) =>
    sb.from('v34_research_goals').upsert({
      id: goal.id,
      user_id: goal.userId,
      title: goal.title,
      metric: goal.metric,
      target_value: goal.targetValue,
      current_value: goal.currentValue,
      period: goal.period,
      status: goal.status,
      due_at: goal.dueAt,
    }),
  );
}

// ── Contributions ──────────────────────────────────────────────────────────

export function listContributions(options?: {
  includeDraftsForAuthorId?: string | null;
  type?: ContributionType | 'all';
  topic?: string;
  query?: string;
  authorHandle?: string;
}): ContributionRecord[] {
  const items = [...state.contributions.values()].filter((item) => {
    const visible =
      item.lifecycle === 'published' ||
      (options?.includeDraftsForAuthorId && item.authorId === options.includeDraftsForAuthorId);
    if (!visible) return false;
    if (options?.type && options.type !== 'all' && item.contributionType !== options.type) return false;
    if (options?.authorHandle && item.authorHandle.toLowerCase() !== options.authorHandle.toLowerCase()) {
      return false;
    }
    if (
      options?.topic &&
      !item.topics.some((t) => t.toLowerCase() === options.topic!.toLowerCase())
    ) {
      return false;
    }
    if (options?.query?.trim()) {
      const q = options.query.trim().toLowerCase();
      const hay = `${item.title} ${item.summary} ${item.tags.join(' ')} ${item.topics.join(' ')} ${item.authorName}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return items.sort((a, b) => (b.publishedAt ?? b.updatedAt).localeCompare(a.publishedAt ?? a.updatedAt));
}

export function getContributionById(idOrSlug: string): ContributionRecord | null {
  const direct = state.contributions.get(idOrSlug);
  if (direct) return direct;
  for (const item of state.contributions.values()) {
    if (item.slug === idOrSlug) return item;
  }
  return null;
}

export function createContribution(input: {
  authorId: string | null;
  authorHandle: string;
  authorName: string;
  contributionType: ContributionType;
  title: string;
  subtitle?: string;
  summary: string;
  document: ResearchDocument;
  primarySourceId?: string | null;
  primarySourceVersionId?: string | null;
  topics: string[];
  tags: string[];
  limitations: string[];
  trustAssessment?: TrustDimensions;
  aiProvenance?: AIProvenance | null;
  evidenceIds: string[];
  claimIds: string[];
}): ContributionRecord {
  const now = new Date().toISOString();
  const id = makeId('contrib');
  const baseSlug = slugify(input.title) || id;
  const slug = [...state.contributions.values()].some((c) => c.slug === baseSlug)
    ? `${baseSlug}-${id.slice(-4)}`
    : baseSlug;

  const source = input.primarySourceId ? state.sources.get(input.primarySourceId) : null;
  const mdx = serializeResearchDocumentToMdx(input.document);

  const record: ContributionRecord = {
    id,
    slug,
    authorId: input.authorId,
    authorHandle: input.authorHandle,
    authorName: input.authorName,
    contributionType: input.contributionType,
    title: input.title,
    subtitle: input.subtitle ?? null,
    summary: input.summary,
    document: { ...input.document, id, updatedAt: now },
    mdx,
    primarySourceId: input.primarySourceId ?? null,
    primarySourceVersionId: input.primarySourceVersionId ?? null,
    topics: input.topics,
    tags: input.tags,
    limitations: input.limitations,
    trustAssessment: input.trustAssessment ?? {
      ...DEFAULT_TRUST,
      review: 'not-reviewed',
      sourceIntegrity: source?.integrityStatus ?? 'active',
    },
    aiProvenance: input.aiProvenance ?? {
      usedAi: false,
      operation: 'none',
      humanReviewed: true,
      humanReviewer: input.authorName,
      syntheticDisclosed: true,
    },
    lifecycle: 'draft',
    version: 1,
    evidenceIds: input.evidenceIds.filter((eid) => state.evidence.has(eid)),
    claimIds: input.claimIds.filter((cid) => state.claims.has(cid)),
    recognition: {
      helpfulReviews: 0,
      referenced: 0,
      saved: 0,
      evidenceUsed: 0,
      replications: 0,
    },
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  state.contributions.set(record.id, record);
  return record;
}

export function updateContribution(
  id: string,
  patch: Partial<Pick<ContributionRecord, 'title' | 'subtitle' | 'summary' | 'document' | 'topics' | 'tags' | 'limitations' | 'primarySourceId' | 'primarySourceVersionId' | 'trustAssessment' | 'aiProvenance' | 'evidenceIds' | 'claimIds'>> & {
    baseVersion?: number;
  },
): { ok: true; contribution: ContributionRecord } | { ok: false; status: 404 | 409; message: string; current?: ContributionRecord } {
  const existing = state.contributions.get(id);
  if (!existing) return { ok: false, status: 404, message: 'Contribution not found.' };
  if (patch.baseVersion !== undefined && patch.baseVersion !== existing.version) {
    return {
      ok: false,
      status: 409,
      message: `Version conflict: expected v${patch.baseVersion}, server is at v${existing.version}.`,
      current: existing,
    };
  }
  const now = new Date().toISOString();
  const nextDoc = patch.document ? { ...patch.document, version: existing.version + 1, updatedAt: now } : existing.document;
  const updated: ContributionRecord = {
    ...existing,
    title: patch.title ?? existing.title,
    subtitle: patch.subtitle !== undefined ? patch.subtitle : existing.subtitle,
    summary: patch.summary ?? existing.summary,
    document: nextDoc,
    mdx: serializeResearchDocumentToMdx(nextDoc),
    topics: patch.topics ?? existing.topics,
    tags: patch.tags ?? existing.tags,
    limitations: patch.limitations ?? existing.limitations,
    primarySourceId: patch.primarySourceId !== undefined ? patch.primarySourceId : existing.primarySourceId,
    primarySourceVersionId:
      patch.primarySourceVersionId !== undefined ? patch.primarySourceVersionId : existing.primarySourceVersionId,
    trustAssessment: patch.trustAssessment ?? existing.trustAssessment,
    aiProvenance: patch.aiProvenance !== undefined ? patch.aiProvenance : existing.aiProvenance,
    evidenceIds: patch.evidenceIds ?? existing.evidenceIds,
    claimIds: patch.claimIds ?? existing.claimIds,
    version: existing.version + 1,
    updatedAt: now,
  };
  state.contributions.set(existing.id, updated);
  return { ok: true, contribution: updated };
}

export function publishContribution(
  id: string,
  options: { retractionAddressed?: boolean; aiProvenance?: AIProvenance | null } = {},
):
  | { ok: true; contribution: ContributionRecord }
  | { ok: false; status: 404 | 422; message: string; blockers?: PublicationBlocker[] } {
  const existing = state.contributions.get(id);
  if (!existing) return { ok: false, status: 404, message: 'Contribution not found.' };

  const primarySource = existing.primarySourceId ? state.sources.get(existing.primarySourceId) : null;
  const effectiveAi = options.aiProvenance !== undefined ? options.aiProvenance : existing.aiProvenance;

  const blockers = evaluatePublicationBlockers({
    contributionType: existing.contributionType,
    title: existing.title,
    summary: existing.summary,
    blocks: existing.document.blocks,
    primarySourceId: existing.primarySourceId,
    primarySourceIntegrity: primarySource?.integrityStatus ?? null,
    retractionAddressed: options.retractionAddressed,
    aiProvenance: effectiveAi,
  });

  if (blockers.length > 0) {
    return {
      ok: false,
      status: 422,
      message: 'Publication blocked by research integrity checks.',
      blockers,
    };
  }

  const now = new Date().toISOString();
  const published: ContributionRecord = {
    ...existing,
    aiProvenance: effectiveAi,
    lifecycle: 'published',
    publishedAt: existing.publishedAt ?? now,
    updatedAt: now,
    version: existing.version + 1,
  };
  state.contributions.set(published.id, published);
  return { ok: true, contribution: published };
}

// ── Drafts, Idempotent Autosave, Optimistic Concurrency & Conflict Resolution ─

export function getDraft(draftId: string, authorId: string): ServerDraftRecord | null {
  const draft = state.drafts.get(draftId);
  if (!draft || draft.authorId !== authorId) return null;
  return draft;
}

export function getDraftHistory(draftId: string, authorId: string): ServerDraftSnapshot[] | null {
  const draft = state.drafts.get(draftId);
  if (!draft || draft.authorId !== authorId) return null;
  return [...(state.draftSnapshots.get(draftId) ?? [])];
}

export function autosaveDraft(input: {
  draftId: string;
  authorId: string;
  mutationId: string;
  baseVersion: number;
  contributionType: ContributionType;
  title: string;
  document: ResearchDocument;
  reason: 'interval' | 'manual' | 'pre-publish' | 'conflict';
}):
  | { ok: true; draft: ServerDraftRecord; replayed: boolean }
  | {
      ok: false;
      status: 403 | 409;
      message: string;
      conflict?: {
        serverVersion: number;
        serverDocument: ResearchDocument;
        clientDocument: ResearchDocument;
      };
    } {
  // 1. Idempotency replay: identical mutationId returns stored result without re-incrementing version.
  const cached = state.idempotency.get(input.mutationId);
  if (cached && cached.draftId === input.draftId) {
    const existing = state.drafts.get(input.draftId);
    if (existing && existing.authorId === input.authorId) {
      return { ok: true, draft: existing, replayed: true };
    }
  }

  const existing = state.drafts.get(input.draftId);
  if (existing && existing.authorId !== input.authorId) {
    return { ok: false, status: 403, message: 'You do not have permission to edit this draft.' };
  }

  const now = new Date().toISOString();

  // 2. Optimistic concurrency check (§11.3 & §11.7): reject stale baseVersion and preserve BOTH versions.
  if (existing && input.baseVersion !== existing.version) {
    const snapshots = state.draftSnapshots.get(existing.id) ?? [];
    snapshots.unshift({
      id: makeId('snap'),
      draftId: existing.id,
      version: existing.version,
      document: existing.document,
      reason: 'conflict',
      createdAt: now,
    });
    state.draftSnapshots.set(existing.id, snapshots.slice(0, 40));

    return {
      ok: false,
      status: 409,
      message: 'Another version of this draft was saved more recently. Both versions have been preserved.',
      conflict: {
        serverVersion: existing.version,
        serverDocument: existing.document,
        clientDocument: input.document,
      },
    };
  }

  const nextVersion = existing ? existing.version + 1 : 1;
  const normalizedDoc: ResearchDocument = {
    ...input.document,
    id: input.draftId,
    title: input.title,
    version: nextVersion,
    updatedAt: now,
  };
  const draft: ServerDraftRecord = {
    id: input.draftId,
    authorId: input.authorId,
    contributionType: input.contributionType,
    title: input.title,
    document: normalizedDoc,
    mdx: serializeResearchDocumentToMdx(normalizedDoc),
    version: nextVersion,
    lastMutationId: input.mutationId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  state.drafts.set(draft.id, draft);

  const snapshots = state.draftSnapshots.get(draft.id) ?? [];
  snapshots.unshift({
    id: makeId('snap'),
    draftId: draft.id,
    version: nextVersion,
    document: normalizedDoc,
    reason: input.reason,
    createdAt: now,
  });
  state.draftSnapshots.set(draft.id, snapshots.slice(0, 40));

  state.idempotency.set(input.mutationId, {
    draftId: draft.id,
    version: draft.version,
    payload: { id: draft.id, version: draft.version },
  });

  return { ok: true, draft, replayed: false };
}

export function resolveDraftConflict(input: {
  draftId: string;
  authorId: string;
  strategy: 'keep-client' | 'keep-server' | 'merge';
  mergedDocument?: ResearchDocument;
  expectedServerVersion: number;
}): { ok: true; draft: ServerDraftRecord } | { ok: false; status: 403 | 404 | 409; message: string } {
  const existing = state.drafts.get(input.draftId);
  if (!existing) return { ok: false, status: 404, message: 'Draft not found.' };
  if (existing.authorId !== input.authorId) {
    return { ok: false, status: 403, message: 'You do not have permission to resolve this draft.' };
  }
  if (existing.version !== input.expectedServerVersion) {
    return {
      ok: false,
      status: 409,
      message: `Draft moved to v${existing.version} while resolving conflict. Refresh and review again.`,
    };
  }

  const now = new Date().toISOString();
  if (input.strategy === 'keep-server') {
    return { ok: true, draft: existing };
  }

  const chosenDoc = input.mergedDocument ?? existing.document;
  const nextVersion = existing.version + 1;
  const resolvedDoc: ResearchDocument = {
    ...chosenDoc,
    id: existing.id,
    version: nextVersion,
    updatedAt: now,
  };
  const updated: ServerDraftRecord = {
    ...existing,
    title: resolvedDoc.title || existing.title,
    document: resolvedDoc,
    mdx: serializeResearchDocumentToMdx(resolvedDoc),
    version: nextVersion,
    updatedAt: now,
  };
  state.drafts.set(updated.id, updated);

  const snapshots = state.draftSnapshots.get(updated.id) ?? [];
  snapshots.unshift({
    id: makeId('snap'),
    draftId: updated.id,
    version: nextVersion,
    document: resolvedDoc,
    reason: 'conflict',
    createdAt: now,
  });
  state.draftSnapshots.set(updated.id, snapshots.slice(0, 40));

  return { ok: true, draft: updated };
}

// ── Personal Library & Research Goals ──────────────────────────────────────

export function listLibraryItems(userId: string): LibraryItemRecord[] {
  return [...(state.library.get(userId) ?? [])];
}

export function upsertLibraryItem(
  userId: string,
  input: Omit<LibraryItemRecord, 'id' | 'userId' | 'createdAt' | 'note'> & { note?: string },
): LibraryItemRecord {
  const items = state.library.get(userId) ?? [];
  const existingIdx = items.findIndex((i) => i.itemType === input.itemType && i.itemId === input.itemId);
  const record: LibraryItemRecord = {
    id: existingIdx >= 0 ? items[existingIdx].id : makeId('lib'),
    userId,
    itemType: input.itemType,
    itemId: input.itemId,
    title: input.title,
    url: input.url,
    collection: input.collection,
    note: input.note ?? null,
    createdAt: existingIdx >= 0 ? items[existingIdx].createdAt : new Date().toISOString(),
  };
  if (existingIdx >= 0) items[existingIdx] = record;
  else {
    items.unshift(record);
    // Increment scholarly save recognition counter when a contribution is saved.
    if (input.itemType === 'contribution') {
      const contrib = state.contributions.get(input.itemId);
      if (contrib) {
        contrib.recognition = { ...contrib.recognition, saved: contrib.recognition.saved + 1 };
      }
    }
  }
  state.library.set(userId, items);
  return record;
}

export function removeLibraryItem(userId: string, itemType: string, itemId: string): boolean {
  const items = state.library.get(userId) ?? [];
  const next = items.filter((i) => !(i.itemType === itemType && i.itemId === itemId));
  if (next.length === items.length) return false;
  state.library.set(userId, next);
  return true;
}

export function listResearchGoals(userId: string): ResearchGoalRecord[] {
  return [...(state.goals.get(userId) ?? state.goals.get('default') ?? [])];
}

export function createResearchGoal(
  userId: string,
  input: Omit<ResearchGoalRecord, 'id' | 'userId' | 'status' | 'createdAt' | 'updatedAt' | 'dueAt'> & {
    dueAt?: string;
  },
): ResearchGoalRecord {
  const now = new Date().toISOString();
  const goal: ResearchGoalRecord = {
    id: makeId('goal'),
    userId,
    title: input.title,
    metric: input.metric,
    targetValue: input.targetValue,
    currentValue: input.currentValue,
    period: input.period,
    status: input.currentValue >= input.targetValue ? 'COMPLETED' : 'ACTIVE',
    dueAt: input.dueAt ?? null,
    createdAt: now,
    updatedAt: now,
  };
  const list = state.goals.get(userId) ?? [...(state.goals.get('default') ?? [])];
  list.unshift(goal);
  state.goals.set(userId, list);
  return goal;
}

export function updateResearchGoal(
  userId: string,
  patch: { id: string; currentValue?: number; status?: ResearchGoalRecord['status'] },
): ResearchGoalRecord | null {
  const list = state.goals.get(userId) ?? [...(state.goals.get('default') ?? [])];
  const idx = list.findIndex((g) => g.id === patch.id);
  if (idx < 0) return null;
  const existing = list[idx];
  const currentValue = patch.currentValue ?? existing.currentValue;
  const status =
    patch.status ?? (currentValue >= existing.targetValue ? 'COMPLETED' : existing.status);
  const updated: ResearchGoalRecord = {
    ...existing,
    userId,
    currentValue,
    status,
    updatedAt: new Date().toISOString(),
  };
  list[idx] = updated;
  state.goals.set(userId, list);
  return updated;
}
