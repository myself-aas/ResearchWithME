import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const SURFACES = path.join(ROOT, '.impeccable', 'surfaces');
const ROUTE_FILES = new Set(['page.tsx', 'error.tsx', 'not-found.tsx', 'global-error.tsx']);
// app/articles/page.tsx only calls redirect('/'), so it has no surface.
const EXCLUDED = new Set(['app/articles/page.tsx']);

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return ROUTE_FILES.has(entry.name) ? [full] : [];
  });
}

function slugFor(routeFile: string): string {
  return routeFile
    .replace(/\([^/]+\)\//g, '')
    .replace(/[[\]]/g, '')
    .replace(/[/.]/g, '-');
}

const routes = walk(path.join(ROOT, 'app'))
  .map((f) => path.relative(ROOT, f).split(path.sep).join('/'))
  .filter((f) => !EXCLUDED.has(f));
const routeSlugs = new Set(routes.map(slugFor));

function briefs() {
  if (!existsSync(SURFACES)) return [];
  return readdirSync(SURFACES)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const text = readFileSync(path.join(SURFACES, f), 'utf8');
      const retired = /^status:\s*retired\s*$/m.test(text);
      const target = /^primary_target:\s*(.+?)\s*$/m.exec(text)?.[1]?.replace(/^["']|["']$/g, '');
      return { slug: f.replace(/\.md$/, ''), retired, target };
    });
}

describe('surface briefs', () => {
  it('every page route has a brief', () => {
    const missing = routes
      .map(slugFor)
      .filter((slug) => !existsSync(path.join(SURFACES, `${slug}.md`)));
    expect(missing, `Missing briefs: ${missing.join(', ')}`).toEqual([]);
  });

  it('every active brief points at a file that exists', () => {
    const bad = briefs()
      .filter((b) => !b.retired)
      .filter((b) => !b.target || !existsSync(path.join(ROOT, b.target)))
      .map((b) => `${b.slug} -> ${b.target}`);
    expect(bad).toEqual([]);
  });

  it('no active brief is orphaned', () => {
    const orphans = briefs()
      .filter((b) => !b.retired && !routeSlugs.has(b.slug))
      .map((b) => b.slug);
    expect(orphans).toEqual([]);
  });
});
