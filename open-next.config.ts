import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import kvIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache';
import memoryQueue from '@opennextjs/cloudflare/overrides/queue/memory-queue';
import kvNextTagCache from '@opennextjs/cloudflare/overrides/tag-cache/kv-next-tag-cache';

/**
 * Workers free plan: rendered pages and revalidation tags both live in KV
 * (one namespace, disjoint key prefixes), so studio revalidatePath() calls
 * refresh static routes such as /sitemap.xml without a redeploy. KV is
 * eventually consistent, so a revalidation can take up to ~60 s to apply.
 * The memory queue regenerates stale pages through WORKER_SELF_REFERENCE.
 */
// Pin the build command to npm, the repository's only package manager, so
// OpenNext does not infer a different runner from whichever lockfile it finds.
// `defineCloudflareConfig` only passes through the keys it knows, so the
// buildCommand override is spread ON TOP of its result.
const openNextConfig = {
  ...defineCloudflareConfig({
    incrementalCache: kvIncrementalCache,
    tagCache: kvNextTagCache,
    queue: memoryQueue,
    enableCacheInterception: true,
  }),
  buildCommand: 'npm run build',
};

export default openNextConfig;
