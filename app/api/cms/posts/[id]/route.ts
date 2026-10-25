import { NextResponse } from 'next/server';
import { requireEditor } from '@/lib/cms/auth';
import { CmsNotFoundError } from '@/lib/cms/errors';
import { normalizePostInput } from '@/lib/cms/schema';
import { errorResponse, isSameOrigin, noStoreHeaders, readJsonBody } from '@/lib/cms/http';
import { revalidateArticle } from '@/lib/cms/revalidate';
import { getEditorCmsStore } from '@/lib/cms/store';
import { getArticles } from '@/lib/db';
import { clientKey, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteProps = { params: Promise<{ id: string }> };

export async function GET(_request: Request, props: RouteProps) {
  const gate = await requireEditor();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const { id } = await props.params;
    const store = await getEditorCmsStore();
    const post = await store.getPost(id);
    if (!post) throw new CmsNotFoundError('That article was not found.');
    return NextResponse.json({ post, mode: gate.mode }, { headers: noStoreHeaders() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, props: RouteProps) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-site requests are not allowed.' }, { status: 403 });
  }

  const gate = await requireEditor();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const limit = rateLimit(clientKey(request, 'cms:update'), 40, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many saves in a short window. Try again in a minute.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  try {
    const { id } = await props.params;
    const store = await getEditorCmsStore();
    const existing = await store.getPost(id);
    if (!existing) throw new CmsNotFoundError('That article was not found.');

    const incoming = body.value && typeof body.value === 'object' ? (body.value as Record<string, unknown>) : {};
    const parsed = normalizePostInput({ ...existing, ...incoming });
    if (!parsed.ok) {
      return NextResponse.json(
        { error: parsed.message, fieldErrors: parsed.fieldErrors },
        { status: 400 },
      );
    }

    if (parsed.value.slug !== existing.slug) {
      const conflict = getArticles().find((article) => article.slug === parsed.value.slug);
      if (conflict) {
        return NextResponse.json(
          { error: 'A catalogue article already uses this URL. Choose a different slug.' },
          { status: 409 },
        );
      }
    }

    const post = await store.updatePost(id, parsed.value);

    // The slug can change while editing, so both old and new readers are cleared.
    if (existing.slug !== post.slug) revalidateArticle(existing.slug);
    revalidateArticle(post.slug);

    return NextResponse.json({ post, mode: gate.mode }, { headers: noStoreHeaders() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, props: RouteProps) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-site requests are not allowed.' }, { status: 403 });
  }

  const gate = await requireEditor();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const limit = rateLimit(clientKey(request, 'cms:delete'), 20, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many deletions in a short window. Try again in a minute.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  try {
    const { id } = await props.params;
    const store = await getEditorCmsStore();
    const existing = await store.getPost(id);
    if (!existing) throw new CmsNotFoundError('That article was not found.');

    await store.deletePost(id);
    revalidateArticle(existing.slug);

    return NextResponse.json({ deleted: true, mode: gate.mode }, { headers: noStoreHeaders() });
  } catch (error) {
    return errorResponse(error);
  }
}
