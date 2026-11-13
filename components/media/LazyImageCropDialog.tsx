'use client';

import { lazyWidget } from '@/lib/motion/lazy';
import type { ImageCropDialogProps } from './ImageCropDialog';

/**
 * Code-split entry for `ImageCropDialog`. The cropper is interactive-only, so
 * it is never server-rendered; mount it when the editor opens it so the
 * chunk is fetched on demand.
 */
const LazyImageCropDialog = lazyWidget<ImageCropDialogProps>(() => import('./ImageCropDialog'), {
  label: 'Loading the photo editor',
  minHeight: 64,
});

export default LazyImageCropDialog;
