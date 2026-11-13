'use client';

import Image, { type ImageProps } from 'next/image';
import { coverLoader, isProcessedCover } from '@/lib/images/urls';

/**
 * `next/image` for article covers. A processed cover (`covers/YYYY/MM/<id>.<ext>`)
 * gets `coverLoader`, which serves its stored `-800` variant to narrow
 * viewports; every other cover (presets, legacy uploads) keeps the default
 * loader. A client component because a `loader` function cannot cross the
 * server/client boundary from a Server Component page.
 */
export default function CoverImage({ src, alt, ...rest }: ImageProps & { src: string }) {
  return <Image src={src} alt={alt} loader={isProcessedCover(src) ? coverLoader : undefined} {...rest} />;
}
