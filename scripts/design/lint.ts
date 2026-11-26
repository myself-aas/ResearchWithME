import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import postcss from 'postcss';
import { design } from '../../src/design';

// Explicit migration boundary, not an exemption claiming site-wide v4 coverage.
// Shared chrome, legacy figures, and inner routes remain inventoried in MIGRATION.md.
export const migratedFiles = ['app/page.tsx', 'components/post/HomeHero.tsx', 'components/design/Primitives.tsx', 'components/design/ExtendedPrimitives.tsx', 'components/assistant/AssistantThread.tsx', 'components/assistant/reme-catalog.tsx', 'components/assistant/LocalModelAvailability.tsx', 'components/assistant/CatalogPreview.tsx', 'app/lab/genui/page.tsx', 'app/assistant/page.tsx'];
export function lintSource(source: string, file = 'component.tsx'): string[] {
  const errors: string[] = [];
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = (node: ts.Node) => {
    if (ts.isJsxAttribute(node)) {
      if (node.name.getText(ast) === 'style') errors.push(`${file}: authored inline style`);
      if (node.name.getText(ast) === 'className' && node.initializer) {
        const classes = node.initializer.getText(ast).replace(/\$\{[^}]*\}/g, '');
        if (/\[|\]|\b(?:bg|text|border|p|m|w|h|gap|rounded|duration)-/.test(classes)) errors.push(`${file}: non-generated class ${classes}`);
      }
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (/#[\da-f]{3,8}\b|\b(?:rgb|hsl)a?\(/i.test(node.text)) errors.push(`${file}: color literal`);
      if (/\b\d*\.?\d+(?:px|rem|em|vw|vh|dvh|cqi|ms)\b/.test(node.text)) errors.push(`${file}: visual length/duration literal`);
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return errors;
}

export function lintMotion(css: string): string[] {
  const errors: string[] = [];
  postcss.parse(css).walkDecls(decl => {
    if (!/^(transition(?:-.*)?|animation(?:-.*)?|scroll-behavior)$/.test(decl.prop)) return;
    let parent: typeof decl.parent | postcss.Document = decl.parent;
    let contained = false;
    while (parent) {
      if (parent.type === 'atrule' && parent.name === 'media' && parent.params.includes('prefers-reduced-motion: no-preference')) contained = true;
      parent = parent.parent;
    }
    if (!contained) errors.push(`I12: ${decl.prop} outside no-preference`);
    if (decl.prop === 'transition') for (const transition of decl.value.split(/,(?![^()]*\))/)) {
      const property = transition.trim().split(/\s+/)[0];
      if (!(design.motion.allowed as readonly string[]).includes(property)) errors.push(`I12: unsupported transition ${property}`);
    }
    if (decl.prop.startsWith('animation')) errors.push('I12: animation requires explicit keyframe-property validation before support');
  });
  return errors;
}

export function runLint(): string[] {
  const errors = migratedFiles.flatMap(file => lintSource(readFileSync(file, 'utf8'), file));
  for (const name of readdirSync('src/design')) {
    if (name === 'color.manifest.ts') continue;
    if (/#[\da-f]{3,8}\b/i.test(readFileSync(join('src/design', name), 'utf8'))) errors.push(`I5: color literal outside color.manifest.ts: ${name}`);
  }
  errors.push(...lintMotion(readFileSync('src/generated/design.css', 'utf8')));
  return errors;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const errors = runLint();
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log(`PASS migrated-source token lint: ${migratedFiles.length} files; generated CSS motion containment. Legacy site-wide coverage is NOT asserted.`);
}
