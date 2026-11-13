import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createTestApp } from '@/test/support/pages';
import { GET as nextIndex, HEAD as nextIndexHead } from '@/app/.well-known/agent-skills/index.json/route';
import { GET as nextSkill, HEAD as nextSkillHead } from '@/app/.well-known/agent-skills/researchwithme-archive/SKILL.md/route';
import { INDEX_PATH, SKILL_PATH } from '@/lib/agent-skills';

describe('Agent Skills Discovery v0.2.0', () => {
  it('serves a discoverable skill and a digest of exactly the bytes at its URL in both runtimes', async () => {
    const app = createTestApp();
    for (const [indexResponse, skillResponse] of [
      [await app.request(INDEX_PATH), await app.request(SKILL_PATH)],
      [await nextIndex(), nextSkill()],
    ]) {
      expect(indexResponse.status).toBe(200);
      expect(skillResponse.status).toBe(200);
      expect(indexResponse.headers.get('content-type')).toContain('application/json');
      expect(skillResponse.headers.get('content-type')).toContain('text/markdown');
      expect(indexResponse.headers.get('access-control-allow-origin')).toBe('*');
      const index = await indexResponse.json();
      const bytes = Buffer.from(await skillResponse.arrayBuffer());
      expect(index.$schema).toBe('https://schemas.agentskills.io/discovery/0.2.0/schema.json');
      expect(index.skills).toHaveLength(1);
      const skill = index.skills[0];
      expect(skill).toMatchObject({ name: 'researchwithme-archive', type: 'skill-md', url: SKILL_PATH });
      expect(skill.description).toBeTruthy();
      expect(skill.digest).toBe(`sha256:${createHash('sha256').update(bytes).digest('hex')}`);
      expect(bytes.toString()).toContain(`name: ${skill.name}`);
      expect(bytes.toString()).toContain(`description: ${skill.description}`);
    }
  });

  it('supports HEAD without content and rejects write methods', async () => {
    const app = createTestApp();
    for (const [path, nextHead] of [[INDEX_PATH, nextIndexHead], [SKILL_PATH, nextSkillHead]] as const) {
      for (const head of [await app.request(path, { method: 'HEAD' }), await nextHead()]) {
        expect(head.status).toBe(200);
        expect(await head.text()).toBe('');
      }
      const post = await app.request(path, { method: 'POST' });
      expect(post.status).toBe(405);
    }
  });
});
