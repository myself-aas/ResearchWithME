import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Contract gate for the agent-skills layer and the figure templates, per
 * AGENTS.md section 19 rule 5 and section 20. These are documentation/template
 * artifacts that the rest of the repo depends on but that never reach the
 * browser, so a lightweight source scan is the right enforcement (no build).
 *
 * Covers:
 *  - `.agents/skills/README.md` lists every vendored + repo-adapted skill
 *    with a link whose target exists.
 *  - `skills-lock.json` pins provenance (version 2, source/commit/hash/installMode)
 *    for every vendored assistant-ui skill, and each `skillPath` exists on disk.
 *  - Relative links inside each `.agents/skills/<name>/SKILL.md` resolve
 *    (skips links to sibling skills that were intentionally not vendored).
 *  - The `templates/*.tmpl` files are hex-free and blue-free (Token rule, reme v3.2 section 12).
 */

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const exists = (path: string) => existsSync(join(root, path));

const skillsDir = join(root, '.agents', 'skills');

const lock = JSON.parse(read('skills-lock.json')) as {
  version: number;
  skills: Record<
    string,
    {
      source: string;
      commit?: string;
      sourceType?: string;
      skillPath?: string;
      computedHash?: string;
      installMode?: string;
      upstreamName?: string;
      upstreamComputedHash?: string;
      adaptation?: string;
    }
  >;
};

/** Skills vendored from assistant-ui/skills (normative, verbatim). */
const VENDORED_ASSISTANT_UI = [
  'generative-ui',
  'elements',
  'primitives',
  'runtime',
  'tools',
] as const;

const FORBIDDEN_PALETTE =
  /\b(?:bg|text|border|ring|from|to|via|fill|stroke|accent|caret|divide|outline|decoration|shadow|ring)-(?:white|black|stone|gray|grey|neutral|slate|zinc|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-/;
const HEX = /#[0-9a-fA-F]{3,8}\b/;

// Match skills@1.9.0's folder-hash contract: sorted relative paths, normalized
// text line endings, and NUL-delimited path/byte-length/content records.
function skillHash(directory: string): string {
  const files: string[] = [];
  function collect(relative = '') {
    for (const entry of readdirSync(join(directory, relative), { withFileTypes: true })) {
      if (entry.name === 'metadata.json') continue;
      if (entry.isDirectory() && ['.git', '__pycache__', '__pypackages__'].includes(entry.name)) continue;
      const path = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) collect(path);
      else if (entry.isFile()) files.push(path);
      else throw new Error(`Unexpected symlink or special file: ${directory}/${path}`);
    }
  }
  collect();
  files.sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
  const hash = createHash('sha256');
  for (const file of files) {
    let bytes = readFileSync(join(directory, file));
    if (!bytes.includes(0)) bytes = Buffer.from(bytes.toString('latin1').replaceAll('\r\n', '\n'), 'latin1');
    hash.update(file).update('\0').update(String(bytes.length)).update('\0').update(bytes);
  }
  return hash.digest('hex');
}

describe('.agents/skills/README.md', () => {
  const readme = read('.agents/skills/README.md');

  it('lists every vendored assistant-ui skill with a resolvable link', () => {
    for (const name of VENDORED_ASSISTANT_UI) {
      const link = `](${name}/SKILL.md)`;
      expect(readme, `${name} missing from the skills table`).toContain(link);
      expect(exists(`.agents/skills/${name}/SKILL.md`), `${name}/SKILL.md must exist`).toBe(true);
    }
  });

  it('lists the repo-adapted assistant-ui-docs bridge with a resolvable link', () => {
    expect(readme, 'assistant-ui-docs missing from the skills table').toContain(
      '](assistant-ui-docs/SKILL.md)',
    );
    expect(exists('.agents/skills/assistant-ui-docs/SKILL.md')).toBe(true);
    expect(exists('.agents/skills/assistant-ui-docs/references/reme-generative-architecture.md')).toBe(
      true,
    );
  });

  it('points at skills-lock.json as the provenance record', () => {
    expect(readme).toContain('skills-lock.json');
  });

  it('indexes every installed skill and keeps its discovery name unique', () => {
    const seen = new Set<string>();
    for (const directory of readdirSync(skillsDir)) {
      const file = join(skillsDir, directory, 'SKILL.md');
      if (!existsSync(file)) continue;
      expect(readme, `${directory} missing from index`).toContain(`](${directory}/SKILL.md)`);
      const name = readFileSync(file, 'utf8').match(/^name:\s*["']?([^\r\n"']+)/m)?.[1].trim();
      expect(name, `${directory} needs a discovery name`).toBeTruthy();
      expect(seen.has(name!), `Duplicate skill discovery name: ${name}`).toBe(false);
      seen.add(name!);
    }
  });
});

describe('skills-lock.json', () => {
  it('pins every installed upstream package and matches its installed content hash', () => {
    for (const [name, entry] of Object.entries(lock.skills)) {
      expect(entry.source, `${name} source`).toMatch(/^[\w.-]+\/[\w.-]+$/);
      expect(entry.commit, `${name} commit`).toMatch(/^[a-f0-9]{40}$/);
      expect(entry.sourceType).toBe('github');
      expect(entry.skillPath, `${name} upstream path`).toMatch(/SKILL\.md$/);
      expect(entry.computedHash, `${name} hash`).toMatch(/^[a-f0-9]{64}$/);
      expect(exists(`.agents/skills/${name}/SKILL.md`), `${name} installed`).toBe(true);
      expect(skillHash(join(skillsDir, name)), `${name} content drift`).toBe(entry.computedHash);
      if (entry.upstreamName) {
        expect(entry.upstreamComputedHash).toMatch(/^[a-f0-9]{64}$/);
        expect(entry.adaptation).toBeTruthy();
        const frontmatter = readFileSync(join(skillsDir, name, 'SKILL.md'), 'utf8');
        expect(frontmatter).toContain(`name: ${name}\n`);
      }
    }
  });

  it('preserves all colliding requested SEO and ai-ready sources', () => {
    const expected: Record<string, string> = {
      seo: 'affaan-m/ecc',
      'seo-iannuttall': 'iannuttall/seo',
      'seo-web-quality': 'addyosmani/web-quality-skills',
      'seo-claude': 'agricidaniel/claude-seo',
      'ai-ready': 'johnpapa/ai-ready',
      'ai-ready-awesome-copilot': 'github/awesome-copilot',
    };
    for (const [name, source] of Object.entries(expected)) {
      expect(lock.skills[name]?.source, name).toBe(source);
    }
  });

  it('is version 2 with provenance for every vendored assistant-ui skill', () => {
    expect(lock.version).toBe(2);
    for (const name of VENDORED_ASSISTANT_UI) {
      const entry = lock.skills[name];
      expect(entry, `${name} must be pinned in skills-lock.json`).toBeTruthy();
      expect(entry.source).toBe('assistant-ui/skills');
      expect(entry.sourceType).toBe('github');
      expect(entry.installMode).toBe('copy');
      expect(entry.commit, `${name} needs a pinned commit`).toBeTruthy();
      expect(entry.computedHash, `${name} needs a computedHash`).toBeTruthy();
      expect(entry.skillPath, `${name} needs a skillPath`).toBeTruthy();
      // The lock's skillPath is the upstream source path; the installed copy
      // lives under .agents/skills/<name>/SKILL.md and is what must exist on disk.
      expect(exists(`.agents/skills/${name}/SKILL.md`), `${name} must be installed under .agents/skills`).toBe(
        true,
      );
    }
  });
});

describe('relative links inside .agents/skills/*/SKILL.md', () => {
  const skillNames = readdirSync(skillsDir).filter((name) =>
    statSync(join(skillsDir, name)).isDirectory(),
  );

  const linkRe = /\[[^\]]*\]\(\s*([^)\s]+)\s*\)/g;

  it('resolve (links to non-vendored sibling skills are allowed to dangle)', () => {
    for (const skill of skillNames) {
      const skillFile = join(skillsDir, skill, 'SKILL.md');
      if (!existsSync(skillFile)) continue;
      // Code samples demonstrate Markdown syntax and generated artifact paths;
      // those are not actual navigational links in the installed package.
      const body = readFileSync(skillFile, 'utf8')
        .replace(/^```[^\n]*\n[\s\S]*?^```[^\n]*$/gm, '')
        .replace(/^~~~[^\n]*\n[\s\S]*?^~~~[^\n]*$/gm, '')
        .replace(/(`+)[\s\S]*?\1/g, '');
      let match: RegExpExecArray | null;
      while ((match = linkRe.exec(body)) !== null) {
        const href = match[1].split('#')[0].split('?')[0];
        if (/^(https?:|mailto:|#|\/)/.test(href)) continue; // external / anchor / absolute
        const target = resolve(skillsDir, skill, href);
        if (existsSync(target)) continue;
        // A link to a sibling skill we did not vendor is allowed to dangle.
        const segs = href.split('/').filter((s) => s && s !== '.');
        if (segs[0] === '..' && segs[1] && !(segs[1] in lock.skills) && !skillNames.includes(segs[1])) {
          continue;
        }
        throw new Error(`Broken relative link in .agents/skills/${skill}/SKILL.md: ${href}`);
      }
    }
  });
});

describe('templates/*.tmpl are token-only (reme v3.2 §12)', () => {
  const tmplDir = join(root, 'templates');
  const tmpls = readdirSync(tmplDir).filter((f) => f.endsWith('.tmpl'));

  it('has at least the three generative-UI templates and none carry a hex literal', () => {
    expect(tmpls).toContain('GENERATIVE_FIGURE_TEMPLATE.tsx.tmpl');
    expect(tmpls).toContain('GENERATIVE_POST_LAYOUT.mdx.tmpl');
    expect(tmpls).toContain('GENERATIVE_UI_SURFACE_TEMPLATE.tsx.tmpl');
    for (const file of tmpls) {
      const body = readFileSync(join(tmplDir, file), 'utf8');
      expect(body.match(HEX), `${file} must not contain a hex literal`).toBeNull();
    }
  });

  it('do not use a raw colour palette (no stone-/gray-/blue- etc. utility classes)', () => {
    for (const file of tmpls) {
      const body = readFileSync(join(tmplDir, file), 'utf8');
      expect(body.match(FORBIDDEN_PALETTE), `${file} must not use a raw palette class`).toBeNull();
    }
  });
});

describe('AGENTS.md references the generative-UI templates', () => {
  const agents = read('AGENTS.md');
  it('names all three figure templates', () => {
    expect(agents).toContain('GENERATIVE_FIGURE_TEMPLATE.tsx.tmpl');
    expect(agents).toContain('GENERATIVE_POST_LAYOUT.mdx.tmpl');
    expect(agents).toContain('GENERATIVE_UI_SURFACE_TEMPLATE.tsx.tmpl');
  });
});
