import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { CATEGORIES, type ArticleFormat, type BlogCategory } from '@/lib/blog-data';
import { ARTICLE_FORMATS, isPublicationType } from './schema';
import { CmsConflictError, CmsError, CmsNotFoundError, CmsUnavailableError, CmsValidationError } from './errors';
import type { CmsArtifact, CmsArtifactType, CmsComment, CmsPost, CmsPostInput, CmsStore } from './types';

const CATEGORY_SET = new Set<string>(CATEGORIES);
const FORMAT_SET = new Set<string>(ARTICLE_FORMATS);
const MAX_ROWS = 500;

interface PostRow {
  id: number | string;
  title: string;
  slug: string;
  content: string;
  status: string;
  subtitle: string | null;
  summary: string | null;
  category: string | null;
  format: string | null;
  publication_type?: string | null;
  author_id: string | null;
  author_name: string | null;
  cover_image: string | null;
  tags: string[] | null;
  key_takeaways: string[] | null;
  read_time: string | null;
  featured: boolean | null;
  likes: number | null;
  published_at: string | null;
  inserted_at: string;
  updated_at: string | null;
  artifact_type: string | null;
  artifact_title: string | null;
  artifact_url: string | null;
  artifact_identifier: string | null;
  artifact_meta: string | null;
}

interface CommentJoinRow {
  id: number | string;
  post_id: number | string;
  author_name: string;
  author_role: string | null;
  content: string;
  inserted_at: string;
  posts: { title: string } | { title: string }[] | null;
}

function toNumericId(id: string): number | null {
  if (!/^\d{1,19}$/.test(id)) return null;
  const value = Number(id);
  return Number.isSafeInteger(value) ? value : null;
}

const ARTIFACT_TYPES = new Set<string>(['paper', 'github', 'dataset']);

function rowToArtifact(row: PostRow): CmsArtifact | null {
  if (!row.artifact_type || !ARTIFACT_TYPES.has(row.artifact_type)) return null;
  return {
    type: row.artifact_type as CmsArtifactType,
    title: row.artifact_title ?? '',
    url: row.artifact_url ?? '',
    identifier: row.artifact_identifier ?? '',
    meta: row.artifact_meta ?? '',
  };
}

function rowToPost(row: PostRow): CmsPost {
  return {
    id: String(row.id),
    title: row.title,
    slug: row.slug,
    content: row.content,
    status: row.status === 'published' ? 'published' : 'draft',
    subtitle: row.subtitle ?? '',
    summary: row.summary ?? '',
    category: CATEGORY_SET.has(row.category ?? '') ? (row.category as BlogCategory) : 'Research Reviews',
    format: FORMAT_SET.has(row.format ?? '') ? (row.format as ArticleFormat) : 'Paper Review',
    publicationType: isPublicationType(row.publication_type) ? row.publication_type : 'review',
    authorId: row.author_id,
    authorName: row.author_name ?? 'ResearchWithMe editors',
    coverImage: row.cover_image,
    tags: row.tags ?? [],
    keyTakeaways: row.key_takeaways ?? [],
    readTime: row.read_time ?? '6 min read',
    featured: row.featured ?? false,
    likes: row.likes ?? 0,
    publishedAt: row.published_at,
    insertedAt: row.inserted_at,
    updatedAt: row.updated_at ?? row.inserted_at,
    artifact: rowToArtifact(row),
  };
}

function postToRow(input: CmsPostInput) {
  return {
    title: input.title,
    slug: input.slug,
    content: input.content,
    status: input.status,
    subtitle: input.subtitle,
    summary: input.summary,
    category: input.category,
    format: input.format,
    publication_type: input.publicationType === 'editorial' ? 'editorial' : 'review',
    author_id: input.authorId,
    author_name: input.authorName,
    cover_image: input.coverImage,
    tags: input.tags,
    key_takeaways: input.keyTakeaways,
    read_time: input.readTime,
    featured: input.featured,
    artifact_type: input.artifact?.type ?? null,
    artifact_title: input.artifact?.title || null,
    artifact_url: input.artifact?.url || null,
    artifact_identifier: input.artifact?.identifier || null,
    artifact_meta: input.artifact?.meta || null,
  };
}

function joinTitle(value: CommentJoinRow['posts']) {
  if (!value) return 'Deleted article';
  if (Array.isArray(value)) return value[0]?.title ?? 'Deleted article';
  return value.title ?? 'Deleted article';
}

function rowToComment(row: CommentJoinRow): CmsComment {
  return {
    id: String(row.id),
    postId: String(row.post_id),
    postTitle: joinTitle(row.posts),
    authorName: row.author_name,
    authorRole: row.author_role ?? 'Reader',
    content: row.content,
    insertedAt: row.inserted_at,
  };
}

function fail(error: PostgrestError | null, fallback: string): never {
  if (!error) throw new CmsUnavailableError(fallback);

  if (error.code === '23505') throw new CmsConflictError();
  if (error.code === '42501') {
    throw new CmsError(
      error.message || 'You do not have permission to perform this action.',
      403,
      'forbidden',
    );
  }
  if (error.code === 'PGRST116') throw new CmsNotFoundError('That record was not found.');
  if (error.code === '23514' || error.code === '23502' || error.code === '22P02') {
    throw new CmsValidationError('The record does not meet the publication rules.');
  }
  console.error('Supabase CMS error:', error.code, error.message);
  throw new CmsUnavailableError(fallback);
}

/**
 * Supabase-backed store. Reads and writes run with the caller's session, so RLS
 * is the enforcement layer: anonymous users only ever see published posts.
 */
export function createSupabaseCmsStore(supabase: SupabaseClient): CmsStore {
  return {
    kind: 'supabase',

    async listPosts() {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('inserted_at', { ascending: false })
        .limit(MAX_ROWS);

      if (error) fail(error, 'Articles could not be loaded.');
      return (data as PostRow[]).map(rowToPost);
    },

    async getPost(id) {
      const numericId = toNumericId(id);
      if (numericId === null) return null;

      const { data, error } = await supabase.from('posts').select('*').eq('id', numericId).maybeSingle();
      if (error) fail(error, 'The article could not be loaded.');
      return data ? rowToPost(data as PostRow) : null;
    },

    async getPostBySlug(slug) {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();

      if (error) fail(error, 'The article could not be loaded.');
      return data ? rowToPost(data as PostRow) : null;
    },

    async createPost(input) {
      const { data, error } = await supabase.from('posts').insert(postToRow(input)).select('*').single();
      if (error) fail(error, 'The article could not be created.');
      return rowToPost(data as PostRow);
    },

    async updatePost(id, input) {
      const numericId = toNumericId(id);
      if (numericId === null) throw new CmsNotFoundError('That article was not found.');

      const { data, error } = await supabase
        .from('posts')
        .update(postToRow(input))
        .eq('id', numericId)
        .select('*')
        .single();

      if (error) fail(error, 'The article could not be updated.');
      return rowToPost(data as PostRow);
    },

    async deletePost(id) {
      const numericId = toNumericId(id);
      if (numericId === null) throw new CmsNotFoundError('That article was not found.');

      const { error } = await supabase.from('posts').delete().eq('id', numericId);
      if (error) fail(error, 'The article could not be deleted.');
    },

    async incrementLikes(id) {
      const numericId = toNumericId(id);
      if (numericId === null) throw new CmsNotFoundError('That article was not found.');

      const { data, error } = await supabase.rpc('increment_post_likes', { target_id: numericId });
      if (error) fail(error, 'The reaction could not be recorded.');
      if (typeof data !== 'number') throw new CmsNotFoundError('That article is not published.');
      return data;
    },

    async listComments() {
      const { data, error } = await supabase
        .from('comments')
        .select('id, post_id, author_name, author_role, content, inserted_at, posts(title)')
        .order('inserted_at', { ascending: false })
        .limit(MAX_ROWS);

      if (error) fail(error, 'Comments could not be loaded.');
      return (data as CommentJoinRow[]).map(rowToComment);
    },

    async listCommentsForPost(postId) {
      const numericId = toNumericId(postId);
      if (numericId === null) return [];

      const { data, error } = await supabase
        .from('comments')
        .select('id, post_id, author_name, author_role, content, inserted_at, posts(title)')
        .eq('post_id', numericId)
        .order('inserted_at', { ascending: false })
        .limit(MAX_ROWS);

      if (error) fail(error, 'Comments could not be loaded.');
      return (data as CommentJoinRow[]).map(rowToComment);
    },

    async listCommentCounts() {
      // A grouped count would need a view or RPC; the free tier comfortably
      // handles a bounded id scan and the result is cached by the caller.
      const { data, error } = await supabase.from('comments').select('post_id').limit(5000);
      if (error) fail(error, 'Comment totals could not be loaded.');

      const counts: Record<string, number> = {};
      for (const row of data as Array<{ post_id: number | string }>) {
        const id = String(row.post_id);
        counts[id] = (counts[id] ?? 0) + 1;
      }
      return counts;
    },

    async getComment(id) {
      const numericId = toNumericId(id);
      if (numericId === null) return null;

      const { data, error } = await supabase
        .from('comments')
        .select('id, post_id, author_name, author_role, content, inserted_at, posts(title)')
        .eq('id', numericId)
        .maybeSingle();

      if (error) fail(error, 'The comment could not be loaded.');
      return data ? rowToComment(data as CommentJoinRow) : null;
    },

    async createComment(postId, input) {
      const numericId = toNumericId(postId);
      if (numericId === null) throw new CmsNotFoundError('That article does not exist.');

      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: numericId,
          author_name: input.authorName,
          author_role: input.authorRole,
          content: input.content,
        })
        .select('id, post_id, author_name, author_role, content, inserted_at, posts(title)')
        .single();

      if (error) fail(error, 'The comment could not be saved.');
      return rowToComment(data as CommentJoinRow);
    },

    async deleteComment(id) {
      const numericId = toNumericId(id);
      if (numericId === null) throw new CmsNotFoundError('That comment was not found.');

      const { error } = await supabase.from('comments').delete().eq('id', numericId);
      if (error) fail(error, 'The comment could not be deleted.');
    },
  };
}
