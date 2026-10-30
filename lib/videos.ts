import manifest from './video-manifest.json';

const videos: string[] = manifest;

/**
 * Videos come from a separate render pipeline, so the app only advertises the
 * files that were present at build time. `npm run videos:manifest` regenerates
 * the list from `public/videos`; it also runs before dev and build.
 */
export function hasVideo(src: string): boolean {
  return videos.includes(src);
}
