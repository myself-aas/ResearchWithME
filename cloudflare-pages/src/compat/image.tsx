/**
 * Temporary `next/image` compatibility shim for shared client components.
 *
 * The Pages build aliases `next/image` here; Next keeps its real module. The
 * used surface covers implicitly-lazy images with `sizes`, the `fill` layout
 * (absolute, inset-0), explicit dimensions otherwise, and `priority` for
 * above-the-fold art. The real component also optimises/ serves AVIF on
 * demand — this shim does neither; it is a faithful <img> until Task 16.
 */
import type { CSSProperties, ImgHTMLAttributes, ReactElement } from 'react';

export interface ImageShimProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  /** When set, the image fills its positioned parent. */
  fill?: boolean;
  /** Above-the-fold: eager load + high fetch priority. */
  priority?: boolean;
}

export function ImageShim({
  src,
  alt,
  fill,
  sizes,
  className,
  priority,
  width,
  height,
  loading,
  style,
  ...rest
}: ImageShimProps): ReactElement {
  const fillStyle: CSSProperties | undefined = fill
    ? { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', ...style }
    : style;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- deliberate: the Pages build has no next/image optimizer
    <img
      src={src}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      sizes={sizes}
      className={className}
      style={fillStyle}
      loading={loading ?? (priority ? 'eager' : 'lazy')}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      {...rest}
    />
  );
}

export default ImageShim;
