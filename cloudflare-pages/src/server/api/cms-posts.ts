import { rateLimit } from '../context';
import {
  clientKey,
  cmsErrorResponse,
  isSameOrigin,
  noStoreHeaders,
  readJsonBody,
} from '../http';
import { json, type ApiRoute, type ApiHandler } from './registry';
import { getEditorCmsStore, resolvePublishableAuthor } from '../stores';
import { requireEditor } from '../auth';
import { CmsNotFoundError } from '@/lib/cms/errors';
import { normalizePostInput } from '@/lib/cms/schema';

const badOrigin = { error: 'Cross-site requests are not allowed.' };

const listPosts: ApiHandler = async (ctx) => {
  const gate = await requireEditor(ctx);
  if (!gate.ok) return json({ error: gate.error }, { status: gate.status });

  try {
    const store = await getEditorCmsStore(ctx);
    const posts = await store.listPosts();
    return json({ posts, mode: gate.mode }, { headers: noStoreHeaders() });
  } catch (error) {
    return cmsErrorResponse(error);
  }
};

const getPost: ApiHandler = async (ctx, params) => {
  const gate = await requireEditor(ctx);
  if (!gate.ok) return json({ error: gate.error }, { status: gate.status });

  try {
    const id = (params.id ?? '').trim().slice(0, 64);
    const store = await getEditorCmsStore(ctx);
    const post = await store.getPost(id);
    if (!post) throw new CmsNotFoundError('That article was not found.');
    return json({ post, mode: gate.mode }, { headers: noStoreHeaders() });
  } catch (error) {
    return cmsErrorResponse(error);
  }
};

const createPost: ApiHandler = async (ctx) => {
  if (!isSameOrigin(ctx.request, ctx.config.siteUrl)) {
    return json(badOrigin, { status: 403 });
  }

  const gate = await requireEditor(ctx);
  if (!gate.ok) return json({ error: gate.error }, { status: gate.status });

  const limit = await rateLimit(ctx, clientKey(ctx.request, 'cms:create'), 20, 60_000);
  if (!limit.allowed) {
    return json(
      { error: 'Too many saves in a short window. Try again in a minute.' },
      { status: 429, headers: { 'retry-after': String(limit.retryAfter) } },
    );
  }

  const body = await readJsonBody(ctx.request);
  if (!body.ok) return body.response;

  const parsed = normalizePostInput(body.value);
  if (!parsed.ok) {
    return json({ error: parsed.message, fieldErrors: parsed.fieldErrors }, { status: 400 });
  }

  if (parsed.value.publicationType === 'editorial' && gate.user?.isEditorInChief !== true) {
    return json({ error: 'Only the Editor-in-Chief can publish an Editorial.' }, { status: 403 });
  }

  try {
    const author = await resolvePublishableAuthor(ctx, parsed.value.authorId);
    const value = { ...parsed.value, authorName: author.displayName };

    const store = await getEditorCmsStore(ctx);
    const existingCmsPost = await store.getPostBySlug(value.slug);
    if (existingCmsPost) {
      return json(
        { error: 'An article already uses this URL. Change the title or slug.' },
        { status: 409 },
      );
    }

    const post = await store.createPost(value);
    return json({ post, mode: gate.mode }, { status: 201, headers: noStoreHeaders() });
  } catch (error) {
    return cmsErrorResponse(error);
  }
};

const patchPost: ApiHandler = async (ctx, params) => {
  if (!isSameOrigin(ctx.request, ctx.config.siteUrl)) {
    return json(badOrigin, { status: 403 });
  }

  const gate = await requireEditor(ctx);
  if (!gate.ok) return json({ error: gate.error }, { status: gate.status });

  const limit = await rateLimit(ctx, clientKey(ctx.request, 'cms:update'), 40, 60_000);
  if (!limit.allowed) {
    return json(
      { error: 'Too many saves in a short window. Try again in a minute.' },
      { status: 429, headers: { 'retry-after': String(limit.retryAfter) } },
    );
  }

  const body = await readJsonBody(ctx.request);
  if (!body.ok) return body.response;

  try {
    const id = (params.id ?? '').trim().slice(0, 64);
    const store = await getEditorCmsStore(ctx);
    const existing = await store.getPost(id);
    if (!existing) throw new CmsNotFoundError('That article was not found.');

    const incoming =
      body.value && typeof body.value === 'object' ? (body.value as Record<string, unknown>) : {};
    const parsed = normalizePostInput({ ...existing, ...incoming });
    if (!parsed.ok) {
      return json({ error: parsed.message, fieldErrors: parsed.fieldErrors }, { status: 400 });
    }

    const existingType = existing.publicationType === 'editorial' ? 'editorial' : 'review';
    const requestedType = parsed.value.publicationType === 'editorial' ? 'editorial' : 'review';
    if (requestedType !== existingType && gate.user?.isEditorInChief !== true) {
      return json(
        { error: 'Only the Editor-in-Chief can change a post between Review and Editorial.' },
        { status: 403 },
      );
    }

    const author = await resolvePublishableAuthor(ctx, parsed.value.authorId);
    const value = { ...parsed.value, authorName: author.displayName };

    if (value.slug !== existing.slug) {
      const conflict = await store.getPostBySlug(value.slug);
      if (conflict) {
        return json(
          { error: 'An article already uses this URL. Change the title or slug.' },
          { status: 409 },
        );
      }
    }

    const post = await store.updatePost(id, value);

    return json({ post, mode: gate.mode }, { headers: noStoreHeaders() });
  } catch (error) {
    return cmsErrorResponse(error);
  }
};

const deletePost: ApiHandler = async (ctx, params) => {
  if (!isSameOrigin(ctx.request, ctx.config.siteUrl)) {
    return json(badOrigin, { status: 403 });
  }

  const gate = await requireEditor(ctx);
  if (!gate.ok) return json({ error: gate.error }, { status: gate.status });

  const limit = await rateLimit(ctx, clientKey(ctx.request, 'cms:delete'), 20, 60_000);
  if (!limit.allowed) {
    return json(
      { error: 'Too many deletions in a short window. Try again in a minute.' },
      { status: 429, headers: { 'retry-after': String(limit.retryAfter) } },
    );
  }

  try {
    const id = (params.id ?? '').trim().slice(0, 64);
    const store = await getEditorCmsStore(ctx);
    const existing = await store.getPost(id);
    if (!existing) throw new CmsNotFoundError('That article was not found.');

    await store.deletePost(id);
    return json({ deleted: true, mode: gate.mode }, { headers: noStoreHeaders() });
  } catch (error) {
    return cmsErrorResponse(error);
  }
};

export const cmsPostsRoutes: ApiRoute[] = [
  {
    path: '/api/cms/posts',
    handlers: { GET: listPosts, POST: createPost },
  },
  {
    path: '/api/cms/posts/:id',
    handlers: { GET: getPost, PATCH: patchPost, DELETE: deletePost },
  },
];
