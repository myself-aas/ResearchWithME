#!/usr/bin/env node
/**
 * Scaffold a new library figure from the two constitution templates.
 *
 *   npm run figures:new -- <slug> "<Human title>" [archetype]
 *
 * Writes `components/library/<Name>.tsx` and `lib/figures/fixtures/<slug>.ts`
 * from `templates/GENERATIVE_FIGURE_TEMPLATE.tsx.tmpl`, refuses duplicates
 * against `lib/figures/registry.ts`, and prints the registration checklist
 * the constitution requires to land as one commit.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const [slugArg, ...rest] = process.argv.slice(2);

if (!slugArg || /^[a-z0-9]+(_[a-z0-9]+)*$/.test(slugArg) === false) {
  console.error('Usage: npm run figures:new -- <kebab_slug> "<Human title>" [archetype]');
  process.exit(1);
}
const slug = slugArg;
const name = slug
  .split('_')
  .map((part) => part[0].toUpperCase() + part.slice(1))
  .join('');
const title = rest[0] ?? name;
const archetype = rest[1] ?? `${slug}-archetype`;
const toolName = `show_${slug.replace(/_/g, '-')}`;

const registryPath = join(root, 'lib', 'figures', 'registry.ts');
const registry = readFileSync(registryPath, 'utf8');
const takenTool = new RegExp(`toolName: ['"]${toolName}['"]`).test(registry);
const takenArchetype = new RegExp(`archetype: ['"]${archetype}['"]`).test(registry);
if (takenTool || takenArchetype) {
  console.error(`Refused: ${takenTool ? `toolName ${toolName}` : ''}${takenTool && takenArchetype ? ' and ' : ''}${takenArchetype ? `archetype ${archetype}` : ''} already registered. Constitution Article 1: pick an unclaimed archetype — see /lab for the current patterns.`);
  process.exit(1);
}

const componentPath = join(root, 'components', 'library', `${name}.tsx`);
const fixturePath = join(root, 'lib', 'figures', 'fixtures', `${slug.replace(/_/g, '-')}.ts`);
if (existsSync(componentPath) || existsSync(fixturePath)) {
  console.error(`Refused: ${componentPath} or ${fixturePath} already exists.`);
  process.exit(1);
}

const template = readFileSync(join(root, 'templates', 'GENERATIVE_FIGURE_TEMPLATE.tsx.tmpl'), 'utf8');
const component = template
  .replaceAll('__NAME__', name)
  .replaceAll('__SLUG__', slug.replace(/_/g, '-'))
  .replaceAll('__ARCHETYPE__', archetype)
  .replaceAll('__TITLE__', title)
  .replaceAll('__TOOL_NAME__', toolName)
  .replaceAll('__KEYWORDS__', `'${slug.replace(/_/g, ' ')}'`);

writeFileSync(componentPath, component);
writeFileSync(
  fixturePath,
  `import type { ComponentProps } from 'react';\nimport ${name} from '@/components/library/${name}';\n\n/**\n * Fixture for the ${name} demo on /lab (Constitution Article 3). Plain,\n * JSON-serialisable data; deterministic — no Math.random, no Date.now.\n */\nexport const ${slug.toUpperCase()}_FIXTURE: ComponentProps<typeof ${name}> = {\n  // Fill in the figure's props here, then wire the registry entry.\n};\n`,
);

console.log(`Scaffolded ${name} (archetype: ${archetype}, tool: ${toolName})`);
console.log(`
Registration checklist — land ALL of it in one commit (Article 3 + 10):
  [ ] ${componentPath.replace(root + '/', '')}                    — implement the interaction (keep the constitution header)
  [ ] lib/figures/fixtures/${slug.replace(/_/g, '-')}.ts        — fill the fixture with JSON data
  [ ] lib/figures/${slug.replace(/_/g, '-')}.ts                 — extract the pure logic; write unit tests
  [ ] lib/figures/registry.ts        — add the entry: mdxName ${name}, toolName ${toolName},
                                        archetype '${archetype}', defaults, keywords (≥2, lowercase)
  [ ] test/figure-constitution.test.ts passes (uniqueness + no-hex + no-random + derivations)
  [ ] npm run quality && npm run verify              — /lab renders the fixture server-side
  [ ] When a post adopts it: flip status to 'adopted', posts: ['<slug>'],
      bind via a thin components/post component, extend routeFigure tests
`);
