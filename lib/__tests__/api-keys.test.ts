import { describe, expect, it } from 'vitest';
import { KEY_PATTERN, MAX_ACTIVE_KEYS, generateApiKey, hashApiKey, parseBearer } from '@/lib/api/keys';

describe('api keys', () => {
  it('generates a key that matches the pattern, with a 12-character prefix', () => {
    const { key, prefix } = generateApiKey(() => new Uint8Array(32));
    expect(key).toBe('rwm_' + 'A'.repeat(43));
    expect(prefix).toBe('rwm_AAAAAAAA');
  });
  it('generates distinct url-safe keys by default', () => {
    const a = generateApiKey().key;
    const b = generateApiKey().key;
    expect(a).toMatch(KEY_PATTERN);
    expect(a).not.toBe(b);
  });
  it('hashes to hex SHA-256', async () => {
    expect(await hashApiKey('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
  it.each([[null], ['Bearer'], ['Basic abc'], ['Bearer rwm_short'], ['bearer rwm_' + 'A'.repeat(43) + ' x']])('rejects %s', (h) => {
    expect(parseBearer(h)).toBeNull();
  });
  it('accepts a well-formed header', () => {
    expect(parseBearer('Bearer rwm_' + 'A'.repeat(43))).toBe('rwm_' + 'A'.repeat(43));
  });
  it('allows five active keys', () => {
    expect(MAX_ACTIVE_KEYS).toBe(5);
  });
});
