import { NextRequest, NextResponse } from 'next/server';
import { getComments, addComment } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId');

    const comments = getComments(postId || undefined);
    return NextResponse.json({ comments });
  } catch (err: unknown) {
    console.error('Error in GET /api/comments:', err);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.postId || !body.text || !body.text.trim()) {
      return NextResponse.json({ error: 'Missing postId or comment text' }, { status: 400 });
    }

    const name = (body.authorName || 'Reader').trim();
    const initials = name
      .split(' ')
      .map((p: string) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    const saved = addComment({
      postId: body.postId,
      authorName: name,
      authorRole: body.authorRole || 'Reader',
      avatar: initials || 'RD',
      text: body.text.trim(),
    });

    return NextResponse.json({ success: true, comment: saved }, { status: 201 });
  } catch (err: unknown) {
    console.error('Error in POST /api/comments:', err);
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
}
