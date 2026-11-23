import 'server-only';

import type { AuthorApplication } from '@/lib/applications';
import type { BlogPost } from '@/lib/blog-data';
import { getArticleCatalogue } from '@/lib/cms/catalogue';
import { getEditorCmsStore } from '@/lib/cms/store';
import type { CmsComment, CmsPost, DashboardUser } from '@/lib/cms/types';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { linkedIdentities } from '@/lib/supabase/identities';
import { getDashboardUser } from '@/lib/cms/auth';
import type { EngagementSignals } from '@/lib/engagement/signals';
import { parseReadMinutes, type ReadingArticle } from './metrics';

/**
 * Reads for the overview dashboards. Everything goes through the caller's own
 * session: the studio store and the application queue are narrowed by
 * row-level security, so a dashboard can never show more than the pages it
 * links to.
 */

export interface StudioData {
  posts: CmsPost[];
  comments: CmsComment[];
  /** False when the archive could not be read; the page says so instead of showing zeros. */
  ok: boolean;
}

export async function loadStudioData(): Promise<StudioData> {
  try {
    const store = await getEditorCmsStore();
    const [posts, comments] = await Promise.all([store.listPosts(), store.listComments()]);
    return { posts, comments, ok: true };
  } catch (error) {
    console.error('Could not read the studio archive for the dashboard:', error);
    return { posts: [], comments: [], ok: false };
  }
}

/** Null in demo mode (there is no queue) and when the query fails. */
export async function loadApplications(): Promise<AuthorApplication[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('author_applications')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as AuthorApplication[];
  } catch (error) {
    console.error('Could not read the writer application queue for the dashboard:', error);
    return null;
  }
}

export interface WriterIdentity {
  /** Profile slug, which is what posts.author_id stores. */
  authorId: string;
  displayName: string;
  /** An unpublished profile cannot carry a byline (lib/cms/publishable-author.ts). */
  published: boolean;
  /** True when the byline was inferred because demo mode has no accounts. */
  inferred: boolean;
}

/**
 * Which byline "my writing" means. With Supabase it is the caller's own
 * profile. Demo mode has no accounts, so it falls back to the byline with the
 * most articles and the page says that it did.
 */
export async function loadWriterIdentity(
  user: DashboardUser | null,
  posts: CmsPost[],
): Promise<WriterIdentity | null> {
  if (!isSupabaseConfigured) {
    const counts = new Map<string, { name: string; count: number }>();
    for (const post of posts) {
      if (!post.authorId) continue;
      const entry = counts.get(post.authorId) ?? { name: post.authorName, count: 0 };
      entry.count += 1;
      counts.set(post.authorId, entry);
    }
    const top = [...counts.entries()].sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))[0];
    return top ? { authorId: top[0], displayName: top[1].name, published: true, inferred: true } : null;
  }

  if (!user) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('slug, display_name, published')
      .eq('user_id', user.id)
      .maybeSingle<{ slug: string; display_name: string; published: boolean }>();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return { authorId: data.slug, displayName: data.display_name, published: data.published, inferred: false };
  } catch (error) {
    console.error('Could not read your author profile for the dashboard:', error);
    return null;
  }
}

export type ApplicationState =
  | { kind: 'unavailable' }
  | { kind: 'editor' }
  | { kind: 'none' }
  | { kind: 'pending'; since: string }
  | { kind: 'rejected'; note: string }
  | { kind: 'approved' };

/** The caller's own writer application, as the reading dashboard reports it. */
export async function loadApplicationState(user: DashboardUser | null): Promise<ApplicationState> {
  if (!isSupabaseConfigured || !user) return { kind: 'unavailable' };
  if (user.isEditor) return { kind: 'editor' };
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('author_applications')
      .select('status, review_note, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle<Pick<AuthorApplication, 'status' | 'review_note' | 'created_at' | 'updated_at'>>();
    if (error) throw new Error(error.message);
    if (!data) return { kind: 'none' };
    if (data.status === 'pending') return { kind: 'pending', since: data.updated_at || data.created_at };
    if (data.status === 'rejected') return { kind: 'rejected', note: data.review_note };
    return { kind: 'approved' };
  } catch (error) {
    console.error('Could not read your writer application for the dashboard:', error);
    return { kind: 'unavailable' };
  }
}

/**
 * The caller's onboarding signals, computed from real server-side state.
 *
 * Returns `null` when anything we cannot read honestly — demo mode, signed-out,
 * or a failed studio/applications read — so the meter hides instead of showing
 * a dishonest score. Undercounting (unknown treated as not-done) is the only
 * error allowed in either direction.
 *
 * `firstSubmission` has no distinct server source (a CmsPost is either a draft
 * or published); a published article has by definition been submitted, so it
 * mirrors firstArticlePublished rather than inventing a separate milestone.
 * `studio` may be passed by pages that already loaded it to avoid a second
 * archive read.
 */
export async function loadEngagementSignals(
  studio?: StudioData,
): Promise<EngagementSignals | null> {
  if (!isSupabaseConfigured) return null;
  const user = await getDashboardUser();
  if (!user) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) throw new Error(error.message);
    const account = data.user;
    const emailVerified = Boolean(account?.email_confirmed_at);
    const identityLinked = linkedIdentities(account?.identities ?? []).length > 0;

    const studioData = studio ?? (await loadStudioData());
    if (!studioData.ok) return null;

    const [application, identity] = await Promise.all([
      loadApplicationState(user),
      loadWriterIdentity(user, studioData.posts),
    ]);
    const applicationApproved = application.kind === 'approved' || application.kind === 'editor';

    const mine = identity ? studioData.posts.filter((post) => post.authorId === identity.authorId) : [];
    const firstDraftSaved = mine.length > 0;
    const published = mine.some((post) => post.status === 'published');

    return {
      emailVerified,
      identityLinked,
      applicationApproved,
      firstDraftSaved,
      firstSubmission: published,
      firstArticlePublished: published,
    };
  } catch (error) {
    console.error('Could not load engagement signals:', error);
    return null;
  }
}

export function toReadingArticle(article: BlogPost): ReadingArticle {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    category: article.category,
    authorName: article.author.name,
    publishedAt: article.dateISO ?? null,
    readMinutes: parseReadMinutes(article.readTime),
  };
}

/** The public catalogue, reduced to what the reading dashboard shows. */
export async function loadReadingArticles(): Promise<ReadingArticle[]> {
  return (await getArticleCatalogue()).map(toReadingArticle);
}
