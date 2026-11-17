import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { linkToolToSource } from '@/lib/v34/wave3-store';
import { LinkToolSourceAliasInputSchema } from '@/lib/v34/wave8-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-tools-sources-link', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, LinkToolSourceAliasInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const res = await linkToolToSource({
    toolId: id,
    sourceId: parsed.data.sourceId,
    releaseTag: parsed.data.releaseTag,
    supabase: auth.actor.supabase,
  });
  if (!res.ok) {
    return NextResponse.json({ error: res.message }, { status: res.status });
  }
  return NextResponse.json({ link: res.link }, { status: 201 });
}
