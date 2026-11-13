import { describe, expect, it } from 'vitest';
import { MAX_INPUT_BYTES, outputSizes, validateJpegInput } from '@/lib/images/policy';

const JPEG = new Uint8Array([0xff, 0xd8, 0xff]);

describe('validateJpegInput', () => {
  it('rejects non-JPEG type or extension', () => {
    expect(validateJpegInput({ name: 'a.png', type: 'image/png', size: 1000 }, JPEG)).toBe(
      'Choose a JPG or JPEG photo.',
    );
    expect(validateJpegInput({ name: 'a.png', type: 'image/jpeg', size: 1000 }, JPEG)).toBe(
      'Choose a JPG or JPEG photo.',
    );
  });
  it('accepts a case-insensitive .JPEG', () => {
    expect(validateJpegInput({ name: 'a.JPEG', type: 'image/jpeg', size: 1000 }, JPEG)).toBeNull();
    expect(validateJpegInput({ name: 'a.jpg', type: 'image/jpeg', size: 1000 }, JPEG)).toBeNull();
  });
  it('enforces the size limit', () => {
    expect(MAX_INPUT_BYTES).toBe(512 * 1024);
    expect(
      validateJpegInput({ name: 'a.jpg', type: 'image/jpeg', size: 512 * 1024 + 1 }, JPEG),
    ).toBe('Choose a photo under 512 KB.');
    expect(
      validateJpegInput({ name: 'a.jpg', type: 'image/jpeg', size: 512 * 1024 }, JPEG),
    ).toBeNull();
  });
  it('checks magic bytes', () => {
    expect(
      validateJpegInput(
        { name: 'a.jpg', type: 'image/jpeg', size: 1000 },
        new Uint8Array([0x89, 0x50, 0x4e]),
      ),
    ).toBe('That file is not a valid JPEG.');
  });
});

describe('outputSizes', () => {
  it('banner full size', () => {
    expect(outputSizes('banner', { width: 2000, height: 1125 })).toEqual([
      { width: 1600, height: 900 },
      { width: 800, height: 450 },
    ]);
  });
  it('banner never upscales', () => {
    expect(outputSizes('banner', { width: 1300, height: 731 })).toEqual([
      { width: 1300, height: 731 },
      { width: 800, height: 450 },
    ]);
  });
  it('banner too small', () => {
    expect(outputSizes('banner', { width: 1000, height: 563 })).toEqual({
      error: 'Crop at least 1200 × 675 px of the photo.',
    });
  });
  it('avatar', () => {
    expect(outputSizes('avatar', { width: 900, height: 900 })).toEqual([{ width: 512, height: 512 }]);
    expect(outputSizes('avatar', { width: 300, height: 300 })).toEqual([{ width: 300, height: 300 }]);
    expect(outputSizes('avatar', { width: 200, height: 200 })).toEqual({
      error: 'Crop at least 256 × 256 px of the photo.',
    });
  });
});
