import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { collectNextApiMethods } from '@/scripts/capture-next-contract';

const fixturePath = path.join(process.cwd(), 'test/fixtures/next-api-methods.json');
const nextApiMethods: Array<{ path: string; method: string }> = JSON.parse(
  readFileSync(fixturePath, 'utf8'),
);

describe('Next.js API baseline inventory', () => {
  it('records exactly the existing 21 operations', () => {
    const actual = collectNextApiMethods('app/api');
    expect(actual).toHaveLength(21);
    expect(actual).toEqual(nextApiMethods);
  });
});
