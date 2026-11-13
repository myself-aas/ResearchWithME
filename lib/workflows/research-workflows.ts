/**
 * Research lifecycle workflows — the single source for the four lifecycle
 * diagrams (components/workflows) and their Mermaid form (docs).
 *
 * Transparency rule (PRODUCT.md, "Brand Commitments"): every detail node says
 * whether it is `live` (backed by shipped code, named in `component`) or
 * `planned`. The diagram labels planned nodes as such; it never presents an
 * unbuilt capability as available.
 *
 * Each stage names the πeme §9 motion pattern its state change uses, so the
 * UI picks the matching Lottie micro-interaction instead of inventing one.
 *
 * Inert data: safe in server components, tests, and docs tooling.
 */

import type { LottieAnimationName } from '@/lib/lottie/animations';

export type WorkflowId = 'discovery' | 'methodology' | 'collaboration' | 'publication';

export type CapabilityStatus = 'live' | 'planned';

export interface WorkflowDetail {
  id: string;
  label: string;
  status: CapabilityStatus;
  /** The shipped component or route that implements a `live` detail. */
  component?: string;
}

export interface WorkflowStage {
  id: string;
  label: string;
  summary: string;
  /** Micro-interaction shown when the stage completes. */
  pattern: LottieAnimationName;
  details: WorkflowDetail[];
}

export interface ResearchWorkflow {
  id: WorkflowId;
  title: string;
  summary: string;
  /** Routes where the diagram is embedded. */
  routes: string[];
  stages: WorkflowStage[];
  outcome: { label: string; summary: string; status: CapabilityStatus };
}

export const RESEARCH_WORKFLOWS: Readonly<Record<WorkflowId, ResearchWorkflow>> = {
  discovery: {
    id: 'discovery',
    title: 'Discovery and literature synthesis',
    summary: 'From a question to a cited answer, with every source traceable.',
    routes: ['/assistant'],
    stages: [
      {
        id: 'query',
        label: 'Query intake',
        summary: 'State the question in plain language or paste an identifier.',
        pattern: 'connect',
        details: [
          { id: 'query-natural', label: 'Natural-language question', status: 'live', component: 'AssistantPanel' },
          { id: 'query-identifiers', label: 'DOI, arXiv and GitHub identifiers', status: 'live', component: 'CitationTool' },
        ],
      },
      {
        id: 'cluster',
        label: 'Source clustering',
        summary: 'Gather relevant reviews from the catalogue across six disciplines.',
        pattern: 'synthesize',
        details: [
          { id: 'cluster-catalogue', label: 'Catalogue retrieval', status: 'live', component: '/api/research-assistant' },
          { id: 'cluster-semantic', label: 'Semantic similarity clusters', status: 'planned' },
        ],
      },
      {
        id: 'graph',
        label: 'Citation graph',
        summary: 'Show how each claim connects back to its sources.',
        pattern: 'connect',
        details: [
          { id: 'graph-provenance', label: 'Provenance graph', status: 'live', component: 'ProvenanceGraph' },
          { id: 'graph-trust', label: 'Trust assessment', status: 'live', component: 'TrustAssessmentSummary' },
        ],
      },
    ],
    outcome: {
      label: 'Cited synthesis',
      summary: 'A summary with inline citations. Uses Gemini when configured, otherwise a deterministic local summary.',
      status: 'live',
    },
  },

  methodology: {
    id: 'methodology',
    title: 'Hypothesis and methodology design',
    summary: 'Turn claims and evidence into a protocol a specialist can check.',
    routes: ['/write'],
    stages: [
      {
        id: 'variables',
        label: 'Variable mapping',
        summary: 'Separate what is claimed from the evidence offered for it.',
        pattern: 'connect',
        details: [
          { id: 'variables-claims', label: 'Claim and evidence cards', status: 'live', component: 'ClaimCard' },
          { id: 'variables-confounders', label: 'Variables, confounders and mediators', status: 'planned' },
        ],
      },
      {
        id: 'validation',
        label: 'Peer validation',
        summary: 'A domain specialist reviews the design before it is run.',
        pattern: 'verify',
        details: [
          { id: 'validation-review', label: 'Specialist review threads', status: 'live', component: 'ReviewThread' },
          { id: 'validation-replication', label: 'Replication status', status: 'live', component: 'TrustAssessmentSummary' },
        ],
      },
      {
        id: 'protocol',
        label: 'Protocol structuring',
        summary: 'Assemble sources, synthesis and methods side by side.',
        pattern: 'synthesize',
        details: [
          { id: 'protocol-workspace', label: 'Research workspace (beta)', status: 'live', component: 'ResearchWorkspace' },
          { id: 'protocol-analysis', label: 'Analysis plan and power calculation', status: 'planned' },
        ],
      },
    ],
    outcome: {
      label: 'Registered protocol',
      summary: 'A time-stamped protocol attached to the review. Not yet available.',
      status: 'planned',
    },
  },

  collaboration: {
    id: 'collaboration',
    title: 'Collaborative drafting and peer review',
    summary: 'Co-authors and reviewers work on one draft without losing either version.',
    routes: ['/dashboard/comments', '/dashboard/edit/[id]'],
    stages: [
      {
        id: 'drafting',
        label: 'Co-author drafting',
        summary: 'Draft in the editorial studio; conflicting edits keep both versions.',
        pattern: 'connect',
        details: [
          { id: 'drafting-studio', label: 'Shared drafts in the studio', status: 'live', component: '/dashboard/edit/[id]' },
          { id: 'drafting-conflicts', label: 'Conflict recovery', status: 'live', component: 'ConflictPanel' },
        ],
      },
      {
        id: 'critique',
        label: 'Inline critique',
        summary: 'Reviewers comment and suggest changes in place.',
        pattern: 'connect',
        details: [
          { id: 'critique-threads', label: 'Review threads and suggestions', status: 'live', component: 'ReviewThread' },
          { id: 'critique-decisions', label: 'Accept or reject suggestions', status: 'live', component: 'ReviewThread' },
        ],
      },
      {
        id: 'lock',
        label: 'Version lock',
        summary: 'Integrity and AI-assistance disclosures are confirmed before release.',
        pattern: 'verify',
        details: [
          { id: 'lock-integrity', label: 'Integrity notice', status: 'live', component: 'IntegrityNotice' },
          { id: 'lock-ai', label: 'AI provenance disclosure', status: 'live', component: 'AIProvenanceDisclosure' },
        ],
      },
    ],
    outcome: {
      label: 'Ready to publish',
      summary: 'An editor-approved draft with its review history attached.',
      status: 'live',
    },
  },

  publication: {
    id: 'publication',
    title: 'Publication and knowledge indexing',
    summary: 'Publish openly, then keep the record findable and connected.',
    routes: ['/dashboard/manage', '/post/[slug]'],
    stages: [
      {
        id: 'metadata',
        label: 'Metadata tagging',
        summary: 'Identifiers and citation formats travel with the review.',
        pattern: 'connect',
        details: [
          { id: 'metadata-ids', label: 'DOI, ORCID and topic tags', status: 'live', component: '/dashboard/manage' },
          { id: 'metadata-formats', label: 'APA, BibTeX and RIS citations', status: 'live', component: 'CitationTool' },
        ],
      },
      {
        id: 'publish',
        label: 'Open-access publishing',
        summary: 'Free to read with no paywall and no account required.',
        pattern: 'verify',
        details: [
          { id: 'publish-reader', label: 'Canonical reader page', status: 'live', component: '/post/[slug]' },
          { id: 'publish-crawl', label: 'Sitemap, robots and manifest', status: 'live', component: 'app/sitemap.ts' },
        ],
      },
      {
        id: 'impact',
        label: 'Impact tracking',
        summary: 'Report reading time without tracking readers.',
        pattern: 'synthesize',
        details: [
          { id: 'impact-citations', label: 'Primary DOI links on reviewed artifacts', status: 'live', component: 'ArticleFeed' },
          { id: 'impact-reading', label: 'Reading-time estimates', status: 'live', component: 'ArticleFeed' },
        ],
      },
    ],
    outcome: {
      label: 'Indexed knowledge',
      summary: 'The review joins the provenance graph and its trust assessment.',
      status: 'live',
    },
  },
};

export const WORKFLOW_ORDER: readonly WorkflowId[] = ['discovery', 'methodology', 'collaboration', 'publication'];

export function getWorkflow(id: WorkflowId): ResearchWorkflow {
  return RESEARCH_WORKFLOWS[id];
}

/** Workflows embedded on a route (matched against the `routes` patterns). */
export function workflowsForRoute(route: string): ResearchWorkflow[] {
  return WORKFLOW_ORDER.map(getWorkflow).filter((workflow) => workflow.routes.includes(route));
}

/* ---------------------------------------------------------------- Mermaid */

const mermaidLabel = (text: string) => `"${text.replace(/"/g, '#quot;')}"`;
const mermaidId = (id: string) => id.replace(/[^A-Za-z0-9_]/g, '_');

/**
 * Serialise a workflow as a Mermaid flowchart for Markdown docs.
 *
 * Uses Mermaid's theme variables instead of hard-coded fills so it renders in
 * GitHub's light and dark themes; planned nodes are dashed and suffixed
 * "(planned)" so the distinction survives without colour.
 */
export function toMermaid(workflow: ResearchWorkflow): string {
  const lines: string[] = ['flowchart TD'];
  // Prefix with the workflow id: Mermaid reserves bare words such as `graph` and `end`.
  const stageIds = workflow.stages.map((stage) => mermaidId(`${workflow.id}_${stage.id}`));
  const outcomeId = `${mermaidId(workflow.id)}_outcome`;
  const planned: string[] = [];

  workflow.stages.forEach((stage, index) => {
    lines.push(`    ${stageIds[index]}[${mermaidLabel(stage.label)}]`);
  });
  const outcomeLabel = workflow.outcome.status === 'planned' ? `${workflow.outcome.label} (planned)` : workflow.outcome.label;
  lines.push(`    ${outcomeId}([${mermaidLabel(outcomeLabel)}])`);
  if (workflow.outcome.status === 'planned') planned.push(outcomeId);

  lines.push(`    ${[...stageIds, outcomeId].join(' --> ')}`);

  workflow.stages.forEach((stage, index) => {
    for (const detail of stage.details) {
      const id = mermaidId(detail.id);
      const label = detail.status === 'planned' ? `${detail.label} (planned)` : detail.label;
      lines.push(`    ${stageIds[index]} -.- ${id}[${mermaidLabel(label)}]`);
      if (detail.status === 'planned') planned.push(id);
    }
  });

  lines.push('    classDef stage stroke-width:2px;');
  lines.push('    classDef planned stroke-dasharray: 5 5;');
  lines.push(`    class ${stageIds.join(',')} stage;`);
  if (planned.length) lines.push(`    class ${planned.join(',')} planned;`);
  return lines.join('\n');
}

/* ------------------------------------------------------- Markdown doc */

/**
 * The whole of docs/research-workflows.md, generated from this module so the
 * doc cannot drift from what the product shows. Regenerate with
 * `npm run docs:workflows`; lib/__tests__/workflows.test.ts fails when the
 * committed file is stale.
 */
export function renderWorkflowsMarkdown(): string {
  const out: string[] = [
    '# Research lifecycle workflows',
    '',
    '<!-- Generated by `npm run docs:workflows` from lib/workflows/research-workflows.ts. Do not edit by hand. -->',
    '',
    'The four lifecycles a piece of research passes through on the platform. The same data renders the',
    '`WorkflowDiagram` / `WorkflowDisclosure` components in the product and the diagrams below.',
    '',
    'Every capability is marked **live** (shipped; the implementing component or route is named) or',
    '**planned** (not built yet). The product labels planned capabilities the same way, so a reader is',
    'never told something exists when it does not.',
    '',
  ];

  for (const id of WORKFLOW_ORDER) {
    const workflow = RESEARCH_WORKFLOWS[id];
    out.push(`## ${workflow.title}`, '', workflow.summary, '');
    out.push(`**Shown on:** ${workflow.routes.map((r) => `\`${r}\``).join(', ')}`, '');
    out.push('```mermaid', toMermaid(workflow), '```', '');
    out.push('| Stage | Capability | Status | Implemented by | Motion pattern |', '|---|---|---|---|---|');
    for (const stage of workflow.stages) {
      for (const detail of stage.details) {
        out.push(
          `| ${stage.label} | ${detail.label} | ${detail.status} | ${detail.component ? `\`${detail.component}\`` : '—'} | ${stage.pattern} |`,
        );
      }
    }
    out.push('', `**Outcome — ${workflow.outcome.label}** (${workflow.outcome.status}): ${workflow.outcome.summary}`, '');
  }
  return out.join('\n');
}
