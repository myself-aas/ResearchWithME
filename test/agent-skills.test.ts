import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GET } from '@/app/.well-known/agent-skills/index.json/route';

/**
 * Agent Skills Discovery index (cloudflare/agent-skills-discovery-rfc v0.2.0),
 * served at `/.well-known/agent-skills/index.json`.
 *
 * The route derives each entry's name/description from the SKILL.md
 * frontmatter and its digest from the artifact's raw bytes, so the tests
 * assert the index against the artifacts on disk — the same bytes the
 * static file server will serve.
 */
interface SkillEntry {
  name: string;
  type: 'skill-md' | 'archive';
  description: string;
  url: string;
  digest: string;
}

interface Index {
  $schema: string;
  skills: SkillEntry[];
}

const SKILLS_DIR = path.join(process.cwd(), 'public', '.well-known', 'agent-skills');

/** Agent Skills naming: 1-64 chars, lowercase alphanumeric + hyphens, no leading/trailing/consecutive hyphens. */
const SKILL_NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

async function serveIndex(): Promise<{ response: Response; index: Index }> {
  const response = GET();
  const body = await response.text();
  return { response, index: JSON.parse(body) as Index };
}

describe('Agent Skills Discovery index', () => {
  it('serves JSON with HTTP 200 and JSON content type', async () => {
    const { response } = await serveIndex();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
  });

  it('is cached like the other machine-readable artifacts', async () => {
    const { response } = await serveIndex();
    expect(response.headers.get('cache-control')).toContain('max-age=3600');
  });

  it('includes the v0.2.0 $schema URI', async () => {
    const { index } = await serveIndex();
    expect(index.$schema).toBe('https://schemas.agentskills.io/discovery/0.2.0/schema.json');
  });

  it('lists at least the five published skills', async () => {
    const { index } = await serveIndex();
    expect(index.skills.length).toBeGreaterThanOrEqual(5);
  });

  it('every entry has the required fields with valid values', async () => {
    const { index } = await serveIndex();
    for (const skill of index.skills) {
      expect(skill.name).toMatch(SKILL_NAME_PATTERN);
      expect(skill.name.length).toBeGreaterThanOrEqual(1);
      expect(skill.name.length).toBeLessThanOrEqual(64);
      expect(skill.type).toBe('skill-md');
      expect(typeof skill.description).toBe('string');
      expect(skill.description.length).toBeGreaterThan(0);
      expect(skill.description.length).toBeLessThanOrEqual(1024);
      expect(skill.url).toMatch(/^https:\/\/researchwith\.me\/\.well-known\/agent-skills\/[a-z0-9-]+\/SKILL\.md$/);
      expect(skill.digest).toMatch(/^sha256:[0-9a-f]{64}$/);
    }
  });

  it('entry names are unique', async () => {
    const { index } = await serveIndex();
    const names = index.skills.map((skill) => skill.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('entry name and description match the SKILL.md frontmatter', async () => {
    const { index } = await serveIndex();
    for (const skill of index.skills) {
      const raw = fs.readFileSync(path.join(SKILLS_DIR, skill.name, 'SKILL.md'), 'utf8');
      expect(raw).toMatch(/^---\n/);
      const end = raw.indexOf('\n---\n');
      expect(end).toBeGreaterThan(0);
      const frontmatter = raw.slice(4, end);
      expect(frontmatter).toContain(`name: ${skill.name}`);
      expect(frontmatter).toContain(`description: ${skill.description}`);
    }
  });

  it("each digest is the SHA-256 of the artifact's raw bytes", async () => {
    const { index } = await serveIndex();
    for (const skill of index.skills) {
      const raw = fs.readFileSync(path.join(SKILLS_DIR, skill.name, 'SKILL.md'), 'utf8');
      const expected = `sha256:${createHash('sha256').update(raw).digest('hex')}`;
      expect(skill.digest).toBe(expected);
    }
  });

  it('every url points at an artifact that exists on disk', async () => {
    const { index } = await serveIndex();
    for (const skill of index.skills) {
      const artifactPath = path.join(SKILLS_DIR, skill.name, 'SKILL.md');
      expect(fs.existsSync(artifactPath)).toBe(true);
    }
  });

  it('all five core skills are published', async () => {
    const { index } = await serveIndex();
    const names = index.skills.map((skill) => skill.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'read-article-markdown',
        'discover-api-surface',
        'search-archive',
        'subscribe-feed',
        'read-llms-index',
      ]),
    );
  });

  it('is valid JSON and round-trips', async () => {
    const { index } = await serveIndex();
    const roundTrip = JSON.parse(JSON.stringify(index)) as Index;
    expect(roundTrip.$schema).toBe(index.$schema);
    expect(roundTrip.skills).toHaveLength(index.skills.length);
  });
});
