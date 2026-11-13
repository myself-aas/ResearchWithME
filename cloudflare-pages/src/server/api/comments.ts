import { cmsCommentToRecord } from '@/lib/cms/mapping';
import { fromPublicPostId, normalizeCommentInput } from '@/lib/cms/schema';
import type { RequestContext } from '../context';
import { rateLimit } from '../context';
import { clientKey, isSameOrigin, readOnlyDeploymentResponse } from '../http';
import { json, type ApiRoute, type ApiHandler } from './registry';

const COMMENT_CACHE = 'public, max-age=15, stale-while-revalidate=60';
const WRITE_FAILURE =
  'The comment could not be saved. Your text is still in the form.';

const getComments: ApiHandler = async (ctx: RequestContext) => {
  try {
    const postId = new URL(ctx.request.url).searchParams.get('postId')?.slice(0, 120);
    const cmsPostId = postId ? fromPublicPostId(postId) : null;

    if (!cmsPostId) return json({ error: 'That article does not exist.' }, { status: 404 });

    try {
      const store = await ctx.services.publicCms(ctx);
      const comments = await store.listCommentsForPost(cmsPostId);
      return json(
        { comments: comments.map(cmsCommentToRecord) },
        { headers: { 'cache-control': COMMENT_CACHE } },
      );
    } catch (error) {
      console.error('Error reading CMS comments:', error);
      return json({ error: 'Comments could not be read.' }, { status: 503 });
    }
  } catch (error) {
    console.error('Error in GET /api/comments:', error);
    return json({ error: 'Comments could not be read.' }, { status: 500 });
  }
};

const postComment: ApiHandler = async (ctx: RequestContext) => {
  const readOnly = readOnlyDeploymentResponse(ctx);
  if (readOnly) return readOnly;

  if (!isSameOrigin(ctx.request, ctx.config.siteUrl)) {
    return json({ error: 'Cross-site requests are not allowed.' }, { status: 403 });
  }

  const limit = await rateLimit(ctx, clientKey(ctx.request, 'comments'), 8, 60_000);
  if (!limit.allowed) {
    return json(
      { error: 'Too many comments in a short window. Wait a minute and try again.' },
      { status: 429, headers: { 'retry-after': String(limit.retryAfter) } },
    );
  }

  if (!(ctx.request.headers.get('content-type') ?? '').includes('application/json')) {
    return json({ error: 'Send the comment as JSON.' }, { status: 415 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await ctx.request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'The comment body could not be read.' }, { status: 400 });
  }

  const postId = typeof body.postId === 'string' ? body.postId.slice(0, 120) : '';
  if (!postId) return json({ error: 'A post id is required.' }, { status: 400 });

  const parsed = normalizeCommentInput({
    authorName: body.authorName,
    authorRole: body.authorRole,
    content: body.text,
  });
  if (!parsed.ok) {
    return json(
      { error: parsed.message, fieldErrors: parsed.fieldErrors },
      { status: 400 },
    );
  }

  const cmsPostId = fromPublicPostId(postId);
  if (!cmsPostId) return json({ error: 'That article does not exist.' }, { status: 404 });

  try {
    const store = await ctx.services.publicCms(ctx);
    const candidate = await store.getPost(cmsPostId).catch((error: unknown) => {
      console.error('Error reading the CMS article for a comment:', error);
      return null;
    });
    const post = candidate?.status === 'published' ? candidate : null;
    if (!post) {
      return json({ error: 'That article does not exist.' }, { status: 404 });
    }

    const comment = await store.createComment(cmsPostId, parsed.value);
    return json({ success: true, comment: cmsCommentToRecord(comment) }, { status: 201 });
  } catch (error) {
    console.error('Error saving a CMS comment:', error);
    return json({ error: WRITE_FAILURE }, { status: 503 });
  }
};

export const commentsRoutes: ApiRoute[] = [
  { path: '/api/comments', handlers: { GET: getComments, POST: postComment } },
];
