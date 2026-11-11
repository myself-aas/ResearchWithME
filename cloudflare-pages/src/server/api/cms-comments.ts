import type { RequestContext } from '../context';
import { rateLimit } from '../context';
import {
  clientKey,
  cmsErrorResponse,
  isSameOrigin,
  noStoreHeaders,
} from '../http';
import { json, type ApiRoute, type ApiHandler } from './registry';
import { getEditorCmsStore } from '../stores';
import { requireEditor } from '../auth';
import { CmsNotFoundError } from '@/lib/cms/errors';

const badOrigin = { error: 'Cross-site requests are not allowed.' };

const listComments: ApiHandler = async (ctx: RequestContext) => {
  const gate = await requireEditor(ctx);
  if (!gate.ok) return json({ error: gate.error }, { status: gate.status });

  try {
    const store = await getEditorCmsStore(ctx);
    const comments = await store.listComments();
    return json({ comments, mode: gate.mode }, { headers: noStoreHeaders() });
  } catch (error) {
    return cmsErrorResponse(error);
  }
};

const deleteComment: ApiHandler = async (ctx: RequestContext, params) => {
  if (!isSameOrigin(ctx.request, ctx.config.siteUrl)) {
    return json(badOrigin, { status: 403 });
  }

  const gate = await requireEditor(ctx);
  if (!gate.ok) return json({ error: gate.error }, { status: gate.status });

  const limit = await rateLimit(ctx, clientKey(ctx.request, 'cms:comment-delete'), 30, 60_000);
  if (!limit.allowed) {
    return json(
      { error: 'Too many moderation actions in a short window. Try again in a minute.' },
      { status: 429, headers: { 'retry-after': String(limit.retryAfter) } },
    );
  }

  try {
    const id = (params.id ?? '').trim().slice(0, 64);
    const store = await getEditorCmsStore(ctx);
    const comment = await store.getComment(id);
    if (!comment) {
      throw new CmsNotFoundError('That comment was not found.');
    }

    await store.deleteComment(id);
    return json({ deleted: true, mode: gate.mode }, { headers: noStoreHeaders() });
  } catch (error) {
    return cmsErrorResponse(error);
  }
};

export const cmsCommentsRoutes: ApiRoute[] = [
  { path: '/api/cms/comments', handlers: { GET: listComments } },
  { path: '/api/cms/comments/:id', handlers: { DELETE: deleteComment } },
];
