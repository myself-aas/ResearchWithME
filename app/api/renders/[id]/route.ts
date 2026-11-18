import { NextResponse } from 'next/server';
import { enforceRateLimit, requireContributor } from '@/lib/v34/http';
import { createArtifactSignedUrl } from '@/lib/v34/artifact-storage';
import { cancelRenderJob, getRenderJob } from '@/lib/v34/wave8-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-render-get', 40, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const render = await getRenderJob(id, auth.actor.id);
  if (!render) {
    return NextResponse.json({ error: 'Render job not found.' }, { status: 404 });
  }
  const freshSigned =
    render.storageKey && render.storageProvider !== 'inline'
      ? await createArtifactSignedUrl({
          provider: render.storageProvider,
          key: render.storageKey,
          expiresInSeconds: 900,
        }).catch(() => null)
      : null;

  return NextResponse.json({
    render: freshSigned
      ? { ...render, artifactUrl: freshSigned.url, artifactExpiresAt: freshSigned.expiresAt }
      : render,
  });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-render-delete', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const render = await cancelRenderJob({
    renderId: id,
    ownerId: auth.actor.id,
    supabase: auth.actor.supabase,
  });
  if (!render) {
    return NextResponse.json({ error: 'Render job not found.' }, { status: 404 });
  }
  return NextResponse.json({ cancelled: true, render });
}
