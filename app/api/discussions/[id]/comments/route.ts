import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import {
  CreateDiscussionCommentInputSchema,
  UpdateDiscussionCommentInputSchema,
} from '@/lib/v34/wave3-contracts';
import {
  addDiscussionComment,
  softDeleteDiscussionComment,
  updateDiscussionComment,
} from '@/lib/v34/wave3-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-discussion-comments-write', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, CreateDiscussionCommentInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const result = await addDiscussionComment({
    discussionId: id,
    ...parsed.data,
    actorId: auth.actor.id,
    actorName: auth.actor.name,
    supabase: auth.actor.supabase,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.message, code: result.code },
      { status: result.status },
    );
  }
  return NextResponse.json({ comment: result.comment }, { status: 201 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-discussion-comments-edit', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, UpdateDiscussionCommentInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const comment = await updateDiscussionComment({
    discussionId: id,
    ...parsed.data,
    supabase: auth.actor.supabase,
  });
  if (!comment) {
    return NextResponse.json({ error: 'Discussion or comment not found.' }, { status: 404 });
  }
  return NextResponse.json({ comment });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const commentId = new URL(request.url).searchParams.get('commentId') ?? '';
  if (!commentId) {
    return NextResponse.json({ error: 'commentId query parameter is required.' }, { status: 400 });
  }

  const deleted = await softDeleteDiscussionComment({
    discussionId: id,
    commentId,
    supabase: auth.actor.supabase,
  });
  if (!deleted) {
    return NextResponse.json({ error: 'Discussion or comment not found.' }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
