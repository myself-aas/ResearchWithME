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
// The production Worker build must not depend on bun: OpenNext otherwise
// auto-detects bun.lock and shells out to `bun run build`, which requires
// bun on PATH (exit 127 on hosts without it — Node hosts always have npm).
// `defineCloudflareConfig` only passes through the keys it knows, so the
// buildCommand override is spread ON TOP of its result.
export default {
  ...defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
  tagCache: kvNextTagCache,
  queue: memoryQueue,
  enableCacheInterception: true,
  }),
  buildCommand: 'npm run build',
};
