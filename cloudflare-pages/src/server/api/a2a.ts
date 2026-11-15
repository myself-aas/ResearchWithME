import { handleA2aMessage } from '@/lib/a2a';
import { getPublicArticleCatalogue } from '../stores';
import { clientKey } from '../http';
import { rateLimit } from '../context';
import type { ApiRoute } from './registry';

export const a2aRoutes: ApiRoute[] = [{
  path: '/api/a2a',
  handlers: {
    POST: async (ctx) => {
      const limit = await rateLimit(ctx, clientKey(ctx.request, 'a2a'), 12, 60_000);
      if (!limit.allowed) return new Response(JSON.stringify({ error: 'Too many requests.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil(limit.retryAfter / 1000)), 'Cache-Control': 'no-store' },
      });
      return handleA2aMessage(ctx.request, () => getPublicArticleCatalogue(ctx), ctx.config.siteUrl);
    },
  },
}];
