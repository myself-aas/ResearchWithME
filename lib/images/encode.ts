import { IMAGE_POLICY, type ImageKind } from './policy';

export type Encoder = (
  type: 'image/webp' | 'image/jpeg',
  quality: number,
) => Promise<Blob | null>;

type EncodeType = 'image/webp' | 'image/jpeg';

const STEP = 5;

export async function encodeWithinBudget(
  encode: Encoder,
  kind: ImageKind,
): Promise<{ blob: Blob; type: EncodeType; quality: number }> {
  const { quality: start, minQuality, maxOutputBytes } = IMAGE_POLICY[kind];
  let type: EncodeType = 'image/webp';
  let percent = start;
  let first = true;

  for (;;) {
    let blob = await encode(type, percent / 100);
    if (first && type === 'image/webp' && (!blob || blob.type !== 'image/webp')) {
      type = 'image/jpeg';
      blob = await encode(type, percent / 100);
    }
    first = false;
    if (!blob) throw new Error('The image could not be encoded.');
    if (blob.size <= maxOutputBytes) return { blob, type, quality: percent };
    if (percent <= minQuality) {
      throw new Error(
        `The image could not be compressed under ${Math.round(maxOutputBytes / 1024)} KB. Crop tighter or choose a smaller photo.`,
      );
    }
    percent = Math.max(minQuality, percent - STEP);
  }
}
