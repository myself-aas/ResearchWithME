/**
 * Writes docs/research-workflows.md from lib/workflows/research-workflows.ts.
 * Usage: npm run docs:workflows
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderWorkflowsMarkdown } from '../lib/workflows/research-workflows';

const target = join(process.cwd(), 'docs', 'research-workflows.md');
writeFileSync(target, renderWorkflowsMarkdown());
console.log(`wrote ${target}`);
