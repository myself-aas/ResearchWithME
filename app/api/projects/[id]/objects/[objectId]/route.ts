import { NextResponse } from 'next/server';
import { enforceRateLimit, requireContributor } from '@/lib/v34/http';
import { unlinkProjectObject } from '@/lib/v34/wave2-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; objectId: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-proj-object-unlink', 25, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id, objectId } = await context.params;
  const url = new URL(request.url);
  const decoded = decodeURIComponent(objectId);
  const [prefix, ...rest] = decoded.includes(':') ? decoded.split(':') : ['', decoded];
  const objectType = url.searchParams.get('objectType') ?? (prefix || 'source');
  const resolvedObjectId = prefix ? rest.join(':') : decoded;
  const ok = await unlinkProjectObject({
    projectId: id,
    objectType,
    objectId: resolvedObjectId,
    supabase: auth.actor.supabase,
  });
  if (!ok) {
    return NextResponse.json({ error: 'Project object link not found.' }, { status: 404 });
  }
  return NextResponse.json({ unlinked: true, projectId: id, objectId, canonicalPreserved: true });
}
