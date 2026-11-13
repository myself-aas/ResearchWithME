import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { collectNextApiMethods } from '@/scripts/capture-next-contract';

const fixturePath = path.join(process.cwd(), 'test/fixtures/next-api-methods.json');
const nextApiMethods: Array<{ path: string; method: string }> = JSON.parse(
  readFileSync(fixturePath, 'utf8'),
);

describe('Next.js API baseline inventory', () => {
  it('preserves the original 19-operation baseline and tracks the new A2A endpoint', () => {
    const actual = collectNextApiMethods('app/api');
    expect(actual.filter(({ path }) => path !== '/api/a2a')).toEqual(nextApiMethods);
    expect(actual.filter(({ path }) => path === '/api/a2a')).toEqual([{ path: '/api/a2a', method: 'POST' }]);
  });
});
