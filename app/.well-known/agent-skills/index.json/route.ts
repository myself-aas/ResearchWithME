import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { absoluteUrl } from '@/lib/seo';

/**
 * Agent Skills Discovery index (RFC: cloudflare/agent-skills-discovery-rfc
 * v0.2.0), served at the well-known URI `/.well-known/agent-skills/index.json`.
 *
 * The index enumerates the SKILL.md artifacts published under
 * `public/.well-known/agent-skills/{name}/SKILL.md`. Each entry's `name` and
 * `description` are read from the artifact's own YAML frontmatter, and the
 * `digest` is the SHA-256 of the artifact's raw bytes — the exact bytes the
 * static file server will serve. Deriving everything from the artifacts at
 * build time means the index and the artifacts cannot drift.
 */
export const dynamic = 'force-static';

const SKILLS_DIR = path.join(process.cwd(), 'public', '.well-known', 'agent-skills');

/** Agent Skills naming: 1-64 chars, lowercase alphanumeric + hyphens, no leading/trailing/consecutive hyphens. */
const SKILL_NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const SCHEMA_URI = 'https://schemas.agentskills.io/discovery/0.2.0/schema.json';

interface Frontmatter {
  name: string;
  description: string;
}

/**
 * Parse the YAML frontmatter of a SKILL.md. Only the two required fields
 * (`name`, `description`) are extracted; the body is left untouched.
 */
function parseFrontmatter(raw: string): Frontmatter | null {
  if (!raw.startsWith('---\n')) return null;
  const end = raw.indexOf('\n---\n', 4);
  if (end === -1) return null;

  const fields: Record<string, string> = {};
  for (const line of raw.slice(4, end).split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (key && value) fields[key] = value;
  }
  if (!fields.name || !fields.description) return null;
  return { name: fields.name, description: fields.description };
}

function sha256Digest(raw: string): string {
  return `sha256:${createHash('sha256').update(raw).digest('hex')}`;
}

function buildIndex() {
  const entries = fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && SKILL_NAME_PATTERN.test(entry.name))
    .map((entry) => {
      const skillPath = path.join(SKILLS_DIR, entry.name, 'SKILL.md');
      const raw = fs.readFileSync(skillPath, 'utf8');
      const frontmatter = parseFrontmatter(raw);
      if (!frontmatter) {
        throw new Error(`SKILL.md at ${skillPath} has no valid name/description frontmatter`);
      }
      if (frontmatter.name !== entry.name) {
        throw new Error(
          `SKILL.md frontmatter name "${frontmatter.name}" does not match its directory "${entry.name}"`,
        );
      }
      return {
        name: entry.name,
        type: 'skill-md' as const,
        description: frontmatter.description,
        url: absoluteUrl(`/.well-known/agent-skills/${entry.name}/SKILL.md`),
        digest: sha256Digest(raw),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return { $schema: SCHEMA_URI, skills: entries };
}

export function GET() {
  const index = buildIndex();

  return new Response(JSON.stringify(index, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
