import 'server-only';

import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CmsUnavailableError } from './errors';
import {
  rejectAuthorResolution,
  resolveProfileRow,
  type ProfileRow,
  type PublishableAuthor,
} from './publishable-author';

/**
 * Resolve the profile a post is attributed to, or throw a 422.
 *
 * The caller must not trust a client-supplied byline: use `author.displayName`
 * for the stored `authorName` so the row records what the profile actually
 * says, not what the request claimed.
 *
 * In local mode there is no `profiles` table to check against, so the byline is
 * accepted as sent. That is a development-only path — production runs with
 * Supabase configured, where the check always applies.
 *
 * The pure decision lives in lib/cms/publishable-author.ts so the Pages store
 * adapter runs the identical semantics over its request-scoped client.
 */

export { resolveProfileRow } from './publishable-author';
export type { AuthorResolution, ProfileRow, PublishableAuthor } from './publishable-author';

export async function resolvePublishableAuthor(authorId: string): Promise<PublishableAuthor> {
  if (!isSupabaseConfigured) {
    return { userId: '', slug: authorId, displayName: authorId };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, slug, display_name, published')
    .eq('slug', authorId)
    .maybeSingle<ProfileRow>();

  // Fail closed. A profile we cannot check is not a profile we may attribute to.
  if (error) {
    throw new CmsUnavailableError('Author profiles could not be checked. Try again in a moment.');
  }

  const resolution = resolveProfileRow(authorId, data ?? null);
  if (!resolution.ok) rejectAuthorResolution(authorId, resolution);
  return resolution.author;
}
