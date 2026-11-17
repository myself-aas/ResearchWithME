import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { LinkProjectObjectInputSchema } from '@/lib/v34/wave2-contracts';
import { linkProjectObject, unlinkProjectObject } from '@/lib/v34/wave2-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-project-objects-write', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, LinkProjectObjectInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const link = await linkProjectObject({
    projectId: id,
    ...parsed.data,
    addedBy: auth.actor.id,
    supabase: auth.actor.supabase,
  });
  if (!link) {
    return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  }
  return NextResponse.json({ link }, { status: 201 });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const url = new URL(request.url);
  const objectType = url.searchParams.get('objectType') ?? '';
  const objectId = url.searchParams.get('objectId') ?? '';
  if (!objectType || !objectId) {
    return NextResponse.json({ error: 'objectType and objectId are required.' }, { status: 400 });
  }

  const removed = await unlinkProjectObject({
    projectId: id,
    objectType,
    objectId,
    supabase: auth.actor.supabase,
  });
  return NextResponse.json({ removed });
}
