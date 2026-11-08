import { NextResponse } from 'next/server';
import { requireEditor } from '@/lib/cms/auth';
import { CmsNotFoundError } from '@/lib/cms/errors';
import { errorResponse, isSameOrigin, noStoreHeaders } from '@/lib/cms/http';
import { getEditorCmsStore } from '@/lib/cms/store';
import { clientKey, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-site requests are not allowed.' }, { status: 403 });
  }

  const gate = await requireEditor();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const limit = await rateLimit(clientKey(request, 'cms:comment-delete'), 30, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many moderation actions in a short window. Try again in a minute.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  try {
    const { id } = await props.params;
    const store = await getEditorCmsStore();
    const comment = await store.getComment(id);
    if (!comment) {
      throw new CmsNotFoundError('That comment was not found.');
    }

    await store.deleteComment(id);
    return NextResponse.json({ deleted: true, mode: gate.mode }, { headers: noStoreHeaders() });
  } catch (error) {
    return errorResponse(error);
  }
}
