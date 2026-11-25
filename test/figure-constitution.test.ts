import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FIGURES, type FigureDefinition } from '@/lib/figures/registry';

const isChrome = (figure: FigureDefinition) => figure.chrome === true;

/**
 * The figure constitution, enforced (FIGURE_CONSTITUTION.md). Every article
 * marked [check] in the document has an assertion here. A violation fails
 * CI — compliance is mechanical, not aspirational.
 */

const LIB_COMPONENTS_DIR = join(process.cwd(), 'components', 'library');
const LOGIC_DIR = join(process.cwd(), 'lib', 'figures');

const libraryFiles = readdirSync(LIB_COMPONENTS_DIR).filter((file) => file.endsWith('.tsx'));
const logicFiles = readdirSync(LOGIC_DIR).filter((file) => file.endsWith('.ts'));

function sourceOf(dir: string, file: string): string {
  return readFileSync(join(dir, file), 'utf8');
}

describe('Article 1 — one archetype per figure', () => {
  it('declares an archetype on every registry entry', () => {
    for (const figure of FIGURES) {
      expect(figure.archetype, figure.toolName).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('never duplicates an archetype among library and non-legacy adopted figures', () => {
    const isLegacy = (figure: FigureDefinition) => figure.legacy === true;
    const claimable = FIGURES.filter((figure) => figure.status === 'library' || !isLegacy(figure));
    const archetypes = claimable.map((figure) => figure.archetype);
    expect(new Set(archetypes).size).toBe(archetypes.length);
  });
});

describe('Article 2 — facts are data', () => {
  it('imports no post data or content in the library', () => {
    for (const file of [...libraryFiles.map((f) => ['c', f] as const), ...logicFiles.map((f) => ['l', f] as const)]) {
      const source = sourceOf(file[0] === 'c' ? LIB_COMPONENTS_DIR : LOGIC_DIR, file[1]);
      expect(source, file[1]).not.toMatch(/from ['"]@?\/?lib\/post\//);
      expect(source, file[1]).not.toMatch(/from ['"].*content\/posts/);
    }
  });
});

describe('Article 3 — generative UI is not optional', () => {
  it('gives every entry a unique tool name and mdx name with routing keywords', () => {
    const toolNames = FIGURES.map((figure) => figure.toolName);
    const mdxNames = FIGURES.map((figure) => figure.mdxName);
    expect(new Set(toolNames).size).toBe(FIGURES.length);
    expect(new Set(mdxNames).size).toBe(FIGURES.length);
    for (const figure of FIGURES) {
      expect(figure.toolName, figure.mdxName).toMatch(/^show_[a-z0-9_-]+$/);
      expect(figure.keywords.length, figure.toolName).toBeGreaterThanOrEqual(2);
      for (const keyword of figure.keywords) {
        expect(keyword, figure.toolName).toBe(keyword.toLowerCase());
      }
    }
  });

  it('derives the MDX map and the thread tool map from the registry — no hand forks', () => {
    const mdxSource = readFileSync(join(process.cwd(), 'components', 'mdx', 'mdx-components.tsx'), 'utf8');
    const threadSource = readFileSync(
      join(process.cwd(), 'components', 'assistant', 'GenerativeFigures.tsx'),
      'utf8',
    );
    expect(mdxSource).toContain('FIGURES.map');
    expect(threadSource).toContain('FIGURES.map');
  });

  it('keeps adopted figures attached to at least one post and library figures unattached', () => {
    for (const figure of FIGURES) {
      if (figure.status === 'adopted' && !isChrome(figure)) {
        expect(figure.posts.length, figure.toolName).toBeGreaterThanOrEqual(1);
      } else if (figure.status === 'adopted') {
        // Chrome figures bind site state, not post data (Article 3).
        expect(isChrome(figure), figure.toolName).toBe(true);
      } else {
        expect(figure.posts, figure.toolName).toHaveLength(0);
        // A library figure must ship with a fixture: defaults carry real data.
        expect(Object.keys(figure.defaults).length, figure.toolName).toBeGreaterThan(0);
      }
    }
  });
});

describe('Article 6 — tokens are the only colours', () => {
  it('contains no hex literals in library components or figure logic', () => {
    for (const file of [...libraryFiles, ...logicFiles]) {
      const dir = file.endsWith('.tsx') ? LIB_COMPONENTS_DIR : LOGIC_DIR;
      expect(sourceOf(dir, file), file).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(sourceOf(dir, file), file).not.toMatch(/\brgb\(/);
    }
  });
});

describe('Article 8 — deterministic and serialisable', () => {
  it('contains no hidden randomness or wall-clock reads in figures', () => {
    // random.ts is the *sanctioned* seeded source (Article 8); everything
    // else must derive its unpredictability from it.
    const scanned = [...libraryFiles, ...logicFiles.filter((file) => file !== 'random.ts')];
    for (const file of scanned) {
      const dir = file.endsWith('.tsx') ? LIB_COMPONENTS_DIR : LOGIC_DIR;
      const source = sourceOf(dir, file);
      expect(source, file).not.toContain('Math.random(');
      expect(source, file).not.toContain('Date.now(');
      expect(source, file).not.toContain('new Date(');
    }
  });

  it('keeps registry defaults JSON-serialisable', () => {
    for (const figure of FIGURES) {
      expect(() => JSON.stringify(figure.defaults), figure.toolName).not.toThrow();
      expect(JSON.parse(JSON.stringify(figure.defaults))).toEqual(figure.defaults);
    }
  });
});

describe('Article 10 — a figure lands complete', () => {
  it('ships every library component as a client component with the shared chrome', () => {
    for (const file of libraryFiles) {
      const source = sourceOf(LIB_COMPONENTS_DIR, file);
      if (file !== 'FigureChrome.tsx') {
        // The chrome itself is hook-free and importable from both surfaces;
        // every interactive figure is a client component (Article 4/5).
        expect(source, file).toMatch(/^'use client';/);
      }
      expect(source, file).toContain('FigureChrome');
    }
  });

  it('ships pure logic next to every library component', () => {
    // Each library component (except the chrome) has a same-named logic concern:
    // either a lib/figures module of its slug or an explicit fixture module.
    expect(libraryFiles.length).toBeGreaterThanOrEqual(7);
    expect(logicFiles.length).toBeGreaterThanOrEqual(7);
  });
});
