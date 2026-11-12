import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';
import { withRegionalCache } from '@opennextjs/cloudflare/overrides/incremental-cache/regional-cache';
import d1NextTagCache from '@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache';
import memoryQueue from '@opennextjs/cloudflare/overrides/queue/memory-queue';

// Without an incremental cache OpenNext renders every request from scratch, so
// `export const revalidate = ...` did nothing and CPU time was billed per page view.
// - R2 (NEXT_INC_CACHE_R2_BUCKET) stores rendered pages, with a per-colo Cache API layer
//   in front so repeat hits skip the R2 read.
// - D1 (NEXT_TAG_CACHE_D1, table `revalidations`) backs revalidatePath/revalidateTag,
//   e.g. a new review refreshing its model page.
// - memoryQueue re-renders stale pages in the background via WORKER_SELF_REFERENCE.
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: 'long-lived' }),
  tagCache: d1NextTagCache,
  queue: memoryQueue,
});
