import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { createManualDraftSnapshot } from '@/lib/v34/store';
import { CreateDraftSnapshotInputSchema } from '@/lib/v34/wave8-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-draft-snapshot', 25, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, CreateDraftSnapshotInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const res = createManualDraftSnapshot(id, auth.actor.id, parsed.data.label);
  if (!res.ok) {
    return NextResponse.json({ error: res.message }, { status: res.status });
  }
  return NextResponse.json({ snapshot: res.snapshot }, { status: 201 });
}
