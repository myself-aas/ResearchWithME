import { describe, expect, it } from 'vitest';
import { svgToDataUri } from '@/lib/svg';

const VALID = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#78350f" /></svg>';

describe('svgToDataUri', () => {
  it('produces an image/svg+xml data URI with the markup percent-encoded', () => {
    const uri = svgToDataUri(VALID);
    expect(uri.startsWith('data:image/svg+xml;utf8,')).toBe(true);
    expect(uri).not.toContain('<');
    expect(decodeURIComponent(uri.slice('data:image/svg+xml;utf8,'.length))).toBe(VALID);
  });
});
