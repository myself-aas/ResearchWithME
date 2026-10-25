import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { hasRevalidateSecret, isValidRevalidateSecret } from '@/lib/cms/secret';

const previousSecret = process.env.REVALIDATE_SECRET;
const previousLegacySecret = process.env.MY_SECRET_TOKEN;

beforeEach(() => {
  process.env.REVALIDATE_SECRET = 'a-long-random-revalidation-secret';
  delete process.env.MY_SECRET_TOKEN;
});

afterAll(() => {
  if (previousSecret === undefined) delete process.env.REVALIDATE_SECRET;
  else process.env.REVALIDATE_SECRET = previousSecret;

  if (previousLegacySecret === undefined) delete process.env.MY_SECRET_TOKEN;
  else process.env.MY_SECRET_TOKEN = previousLegacySecret;
});

describe('revalidation secret', () => {
  it('reports configuration only when a secret exists', () => {
    expect(hasRevalidateSecret()).toBe(true);
    delete process.env.REVALIDATE_SECRET;
    expect(hasRevalidateSecret()).toBe(false);
  });

  it('accepts only the exact secret', () => {
    expect(isValidRevalidateSecret('a-long-random-revalidation-secret')).toBe(true);
    expect(isValidRevalidateSecret('a-long-random-revalidation-secret ')).toBe(false);
    expect(isValidRevalidateSecret('wrong')).toBe(false);
    expect(isValidRevalidateSecret('')).toBe(false);
    expect(isValidRevalidateSecret(null)).toBe(false);
  });

  it('supports the legacy MY_SECRET_TOKEN name', () => {
    delete process.env.REVALIDATE_SECRET;
    process.env.MY_SECRET_TOKEN = 'legacy-secret';
    expect(isValidRevalidateSecret('legacy-secret')).toBe(true);
  });

  it('never accepts anything when no secret is configured', () => {
    delete process.env.REVALIDATE_SECRET;
    delete process.env.MY_SECRET_TOKEN;
    expect(isValidRevalidateSecret('')).toBe(false);
    expect(isValidRevalidateSecret('anything')).toBe(false);
  });
});
