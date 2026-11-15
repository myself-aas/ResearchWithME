import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { collectNextApiMethods } from '@/scripts/capture-next-contract';

const fixturePath = path.join(process.cwd(), 'test/fixtures/next-api-methods.json');
const nextApiMethods: Array<{ path: string; method: string }> = JSON.parse(
  readFileSync(fixturePath, 'utf8'),
);

describe('Next.js API baseline inventory', () => {
  it('preserves the baseline and explicitly tracks subsequently added endpoints', () => {
    const actual = collectNextApiMethods('app/api');
    const additions = [
      { path: '/api/a2a', method: 'POST' },
      { path: '/api/admin/linkedin/auth', method: 'GET' },
      { path: '/api/admin/linkedin/callback', method: 'GET' },
      { path: '/api/admin/linkedin/post', method: 'POST' },
      { path: '/api/admin/linkedin/status', method: 'GET' },
      { path: '/api/cron/linkedin-batch', method: 'GET' },
      { path: '/api/webhooks/article-published', method: 'POST' },
    ];
    const expected = [...nextApiMethods, ...additions].sort((a, b) =>
      a.path === b.path ? a.method.localeCompare(b.method) : a.path.localeCompare(b.path),
    );
    expect(actual).toEqual(expected);
  });
});
