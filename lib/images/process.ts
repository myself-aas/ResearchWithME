'use client';

import { encodeWithinBudget, type Encoder } from './encode';
import { outputSizes, type ImageKind } from './policy';

export type Rotation = 0 | 90 | 180 | 270;

/** `react-easy-crop`'s `croppedAreaPixels`, relative to the rotated image. */
export type PixelArea = { x: number; y: number; width: number; height: number };

export type EncodedImage = {
  blob: Blob;
  width: number;
  height: number;
  type: 'image/webp' | 'image/jpeg';
};

function canvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const element = document.createElement('canvas');
  element.width = width;
  element.height = height;
  const context = element.getContext('2d');
  if (!context) throw new Error('This browser cannot process images.');
  return [element, context];
}

function canvasEncoder(element: HTMLCanvasElement): Encoder {
  return (type, quality) =>
    new Promise<Blob | null>((resolve) => {
      element.toBlob(resolve, type, quality);
    });
}

/**
 * Crops, resizes and re-encodes a JPEG in the browser. Re-encoding through a
 * canvas drops every EXIF field (GPS included); orientation is applied first.
 */
export async function cropAndEncode(
  file: File,
  area: PixelArea,
  rotation: Rotation,
  kind: ImageKind,
): Promise<EncodedImage[]> {
  const crop = {
    x: Math.round(area.x),
    y: Math.round(area.y),
    width: Math.round(area.width),
    height: Math.round(area.height),
  };
  const sizes = outputSizes(kind, crop);
  if (!Array.isArray(sizes)) throw new Error(sizes.error);

  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  let source: HTMLCanvasElement;
  try {
    const quarterTurn = rotation === 90 || rotation === 270;
    const boundsWidth = quarterTurn ? bitmap.height : bitmap.width;
    const boundsHeight = quarterTurn ? bitmap.width : bitmap.height;
    const [rotated, rotatedContext] = canvas(boundsWidth, boundsHeight);
    rotatedContext.translate(boundsWidth / 2, boundsHeight / 2);
    rotatedContext.rotate((rotation * Math.PI) / 180);
    rotatedContext.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);

    const [cropped, croppedContext] = canvas(crop.width, crop.height);
    croppedContext.drawImage(rotated, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
    source = cropped;
  } finally {
    bitmap.close();
  }

  const results: EncodedImage[] = [];
  for (const size of sizes) {
    const [target, context] = canvas(size.width, size.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(source, 0, 0, size.width, size.height);
    const { blob, type } = await encodeWithinBudget(canvasEncoder(target), kind);
    results.push({ blob, width: size.width, height: size.height, type });
  }
  return results;
}
