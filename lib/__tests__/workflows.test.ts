import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LOTTIE_ANIMATIONS } from '@/lib/lottie/animations';
import {
  RESEARCH_WORKFLOWS,
  WORKFLOW_ORDER,
  renderWorkflowsMarkdown,
  toMermaid,
  workflowsForRoute,
} from '@/lib/workflows/research-workflows';
import { WorkflowDiagram, WorkflowDisclosure } from '@/components/workflows';

const workflows = WORKFLOW_ORDER.map((id) => RESEARCH_WORKFLOWS[id]);

/** Resolve a `component` reference to a file in the repo. */
function referenceExists(ref: string): boolean {
  const root = process.cwd();
  if (ref.startsWith('/api/')) return existsSync(join(root, 'app', ref, 'route.ts'));
  if (ref.startsWith('/dashboard/')) return existsSync(join(root, 'app/dashboard/(studio)', ref.slice('/dashboard/'.length), 'page.tsx'));
  if (ref.startsWith('/')) return existsSync(join(root, 'app', ref, 'page.tsx'));
  if (ref.includes('/')) return existsSync(join(root, ref));
  const candidates = ['components', 'components/scholarly', 'components/editor', 'components/graph', 'components/workspace'];
  return candidates.some((dir) => existsSync(join(root, dir, `${ref}.tsx`)));
}

describe('research workflow data', () => {
  it('defines the four lifecycles in order', () => {
    expect(WORKFLOW_ORDER).toEqual(['discovery', 'methodology', 'collaboration', 'publication']);
    for (const workflow of workflows) expect(workflow.stages.length).toBe(3);
  });

  it('gives every node a unique id and a known motion pattern', () => {
    const ids = workflows.flatMap((w) => w.stages.flatMap((s) => [s.id + w.id, ...s.details.map((d) => d.id)]));
    expect(new Set(ids).size).toBe(ids.length);
    for (const stage of workflows.flatMap((w) => w.stages)) expect(LOTTIE_ANIMATIONS).toHaveProperty(stage.pattern);
  });

  it('only marks a capability live when the code that ships it exists', () => {
    for (const detail of workflows.flatMap((w) => w.stages.flatMap((s) => s.details))) {
      if (detail.status === 'planned') {
        expect(detail.component, detail.id).toBeUndefined();
        continue;
      }
      expect(detail.component, detail.id).toBeTruthy();
      expect(referenceExists(detail.component!), `${detail.id} → ${detail.component}`).toBe(true);
    }
  });

  it('embeds on real routes', () => {
    expect(workflowsForRoute('/assistant').map((w) => w.id)).toEqual(['discovery']);
    expect(workflowsForRoute('/post/[slug]').map((w) => w.id)).toEqual(['publication']);
    for (const route of workflows.flatMap((w) => w.routes)) expect(referenceExists(route), route).toBe(true);
  });
});

describe('toMermaid', () => {
  it('serialises a theme-neutral flowchart that labels planned nodes in text', () => {
    const chart = toMermaid(RESEARCH_WORKFLOWS.methodology);
    expect(chart.startsWith('flowchart TD')).toBe(true);
    expect(chart).toContain('methodology_variables --> methodology_validation --> methodology_protocol --> methodology_outcome');
    expect(chart).toContain('"Registered protocol (planned)"');
    expect(chart).toContain('class methodology_outcome,variables_confounders,protocol_analysis planned;');
    // No bare Mermaid keywords as node ids.
    for (const w of workflows) expect(toMermaid(w)).not.toMatch(/^\s+(graph|end|subgraph)[\[(\s]/m);
    // No hard-coded fills: GitHub light and dark themes both render it.
    expect(chart).not.toMatch(/fill:#/);
  });
});

describe('WorkflowDiagram (SSR)', () => {
  it('renders the full diagram as semantic, crawlable HTML', () => {
    const html = renderToStaticMarkup(createElement(WorkflowDiagram, { workflow: RESEARCH_WORKFLOWS.discovery }));
    expect(html).toContain('<section aria-labelledby="workflow-discovery-title"');
    expect(html).toContain('<h2 id="workflow-discovery-title"');
    expect(html.match(/<h3/g)).toHaveLength(4); // 3 stages + outcome
    expect(html).toContain('<ol');
    expect(html).toContain('<details');
    // Capabilities are in the markup even while collapsed.
    expect(html).toContain('Provenance graph');
    expect(html).toContain('Semantic similarity clusters');
    expect(html).toContain('Planned');
    expect(html).not.toContain('opacity:0');
  });

  it('shifts heading levels when nested', () => {
    const html = renderToStaticMarkup(
      createElement(WorkflowDiagram, { workflow: RESEARCH_WORKFLOWS.publication, heading: 'h3' }),
    );
    expect(html).toContain('<h3 id="workflow-publication-title"');
    expect(html.match(/<h4/g)).toHaveLength(4);
  });
});

describe('workflow embeds stay in sync with the data', () => {
  // Route → the source file that renders it (client panels render inside thin pages).
  const SOURCE: Record<string, string> = {
    '/assistant': 'components/AssistantPanel.tsx',
    '/write': 'app/write/page.tsx',
    '/dashboard/comments': 'app/dashboard/(studio)/comments/page.tsx',
    '/dashboard/edit/[id]': 'app/dashboard/(studio)/edit/[id]/page.tsx',
    '/dashboard/manage': 'app/dashboard/(studio)/manage/page.tsx',
    '/post/[slug]': 'app/post/[slug]/page.tsx',
  };

  it('every route a workflow lists embeds that workflow', () => {
    for (const workflow of workflows) {
      for (const route of workflow.routes) {
        const file = SOURCE[route];
        expect(file, `no source mapped for ${route}`).toBeTruthy();
        const src = readFileSync(join(process.cwd(), file), 'utf8');
        expect(src, `${route} should embed ${workflow.id}`).toContain(`RESEARCH_WORKFLOWS.${workflow.id}`);
      }
    }
  });

  it('the disclosure is closed by default and server-renders the whole diagram', () => {
    const html = renderToStaticMarkup(
      createElement(WorkflowDisclosure, { workflow: RESEARCH_WORKFLOWS.publication, summary: 'How this review was published' }),
    );
    expect(html).toMatch(/^<details data-workflow-disclosure="publication"/);
    expect(html).not.toMatch(/<details[^>]* open/);
    expect(html).toContain('How this review was published');
    expect(html).toContain('<h3 id="workflow-publication-title"');
    expect(html).toContain('Sitemap, robots and manifest');
  });
});

describe('docs/research-workflows.md', () => {
  it('is generated from the workflow data (run `npm run docs:workflows` if this fails)', () => {
    const committed = readFileSync(join(process.cwd(), 'docs/research-workflows.md'), 'utf8').replace(/\r\n/g, '\n');
    expect(committed).toBe(renderWorkflowsMarkdown());
  });
});
