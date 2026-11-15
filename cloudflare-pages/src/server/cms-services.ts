import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseCmsStore } from '@/lib/cms/supabase-store';
import { createSupabaseServerClient } from './auth';
import { isPublicConfigValid, type RequestContext, type RuntimeServices } from './context';
import { createReadOnlyCmsStore } from './stores';
import { CmsUnavailableError } from '@/lib/cms/errors';

/** CMS clients are scoped to the request; public reads never receive its cookies. */
function publicClient(ctx: RequestContext): SupabaseClient | null {
  if (!isPublicConfigValid(ctx.config)) return null;
  return createServerClient(ctx.config.supabaseUrl, ctx.config.supabaseKey, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}

function sessionClient(ctx: RequestContext): SupabaseClient | null {
  return isPublicConfigValid(ctx.config) ? createSupabaseServerClient(ctx) : null;
}

export function createCmsServices(): Pick<RuntimeServices, 'publicClient' | 'sessionClient' | 'publicCms' | 'editorCms'> {
  return {
    publicClient,
    sessionClient,
    async publicCms(ctx) {
      const client = publicClient(ctx);
      return client ? createSupabaseCmsStore(client) : createReadOnlyCmsStore();
    },
    async editorCms(ctx) {
      const client = sessionClient(ctx);
      if (!client) throw new CmsUnavailableError('Durable storage is not configured for this deployment.');
      return createSupabaseCmsStore(client);
    },
  };
}
