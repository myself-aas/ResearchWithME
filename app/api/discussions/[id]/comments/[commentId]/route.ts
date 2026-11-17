import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import {
  getDiscussionById,
  softDeleteDiscussionComment,
  updateDiscussionComment,
} from '@/lib/v34/wave3-store';
import { UpdateDiscussionCommentInputSchema } from '@/lib/v34/wave7-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; commentId: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-discussion-comment-edit', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, UpdateDiscussionCommentInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id, commentId } = await context.params;
  const discussion = getDiscussionById(id);
  if (!discussion) {
    return NextResponse.json({ error: 'Discussion not found.' }, { status: 404 });
  }
  if (discussion.locked) {
    return NextResponse.json({ error: 'Discussion thread is locked.' }, { status: 423 });
  }
  const existing = discussion.comments.find((c) => c.id === commentId);
  if (!existing) {
    return NextResponse.json({ error: 'Discussion comment not found.' }, { status: 404 });
  }
  if (existing.authorId && existing.authorId !== auth.actor.id && !auth.actor.isEditor) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const updated = await updateDiscussionComment({
    discussionId: id,
    commentId,
    body: parsed.data.body,
    supabase: auth.actor.supabase,
  });

  if (!updated) {
    return NextResponse.json({ error: 'Discussion comment not found.' }, { status: 404 });
  }
  return NextResponse.json({ comment: updated });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; commentId: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-discussion-comment-delete', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id, commentId } = await context.params;
  const discussion = getDiscussionById(id);
  if (!discussion) {
    return NextResponse.json({ error: 'Discussion not found.' }, { status: 404 });
  }
  const existing = discussion.comments.find((c) => c.id === commentId);
  if (!existing) {
    return NextResponse.json({ error: 'Discussion comment not found.' }, { status: 404 });
  }
  if (existing.authorId && existing.authorId !== auth.actor.id && !auth.actor.isEditor) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const ok = await softDeleteDiscussionComment({
    discussionId: id,
    commentId,
    supabase: auth.actor.supabase,
  });

  if (!ok) {
    return NextResponse.json({ error: 'Discussion comment not found.' }, { status: 404 });
  }
  const refreshed = getDiscussionById(id)?.comments.find((c) => c.id === commentId) ?? null;
  return NextResponse.json({ comment: refreshed, softDeleted: true });
}
