import { NextRequest, NextResponse } from 'next/server';
import { getArticleBySlug, getArticleById, incrementLikes } from '@/lib/db';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const id = params.id;
    const article = getArticleBySlug(id) || getArticleById(id);

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json({ article });
  } catch (err: unknown) {
    console.error('Error fetching article:', err);
    return NextResponse.json({ error: 'Failed to fetch article' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const id = params.id;
    const newLikes = incrementLikes(id);
    return NextResponse.json({ success: true, likes: newLikes });
  } catch (err: unknown) {
    console.error('Error updating article likes:', err);
    return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
  }
}
