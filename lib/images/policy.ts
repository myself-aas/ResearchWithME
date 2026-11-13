export type ImageKind = 'avatar' | 'banner';
export type Size = { width: number; height: number };

export const MAX_INPUT_BYTES = 512 * 1024;

export const IMAGE_POLICY: Record<
  ImageKind,
  {
    aspect: number;
    outputs: Size[];
    minCrop: Size;
    quality: number;
    minQuality: number;
    maxOutputBytes: number;
  }
> = {
  avatar: {
    aspect: 1,
    outputs: [{ width: 512, height: 512 }],
    minCrop: { width: 256, height: 256 },
    quality: 85,
    minQuality: 70,
    maxOutputBytes: 100 * 1024,
  },
  banner: {
    aspect: 16 / 9,
    outputs: [
      { width: 1600, height: 900 },
      { width: 800, height: 450 },
    ],
    minCrop: { width: 1200, height: 675 },
    quality: 82,
    minQuality: 70,
    maxOutputBytes: 300 * 1024,
  },
};

export function validateJpegInput(
  file: { name: string; type: string; size: number },
  head: Uint8Array,
): string | null {
  const name = file.name.toLowerCase();
  if (file.type !== 'image/jpeg' || !(name.endsWith('.jpg') || name.endsWith('.jpeg'))) {
    return 'Choose a JPG or JPEG photo.';
  }
  if (file.size > MAX_INPUT_BYTES) return 'Choose a photo under 512 KB.';
  if (head.length < 3 || head[0] !== 0xff || head[1] !== 0xd8 || head[2] !== 0xff) {
    return 'That file is not a valid JPEG.';
  }
  return null;
}

export function outputSizes(kind: ImageKind, crop: Size): Size[] | { error: string } {
  const { aspect, outputs, minCrop } = IMAGE_POLICY[kind];
  if (crop.width < minCrop.width || crop.height < minCrop.height) {
    return { error: `Crop at least ${minCrop.width} × ${minCrop.height} px of the photo.` };
  }
  const seen = new Set<number>();
  const result: Size[] = [];
  for (const target of outputs) {
    const width = Math.min(target.width, Math.round(crop.width));
    if (seen.has(width)) continue;
    seen.add(width);
    result.push({ width, height: Math.round(width / aspect) });
  }
  return result;
}
