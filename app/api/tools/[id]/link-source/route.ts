import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { LinkToolSourceInputSchema } from '@/lib/v34/wave3-contracts';
import { linkToolToSource } from '@/lib/v34/wave3-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-tools-link-source', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, LinkToolSourceInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const result = await linkToolToSource({
    toolId: id,
    ...parsed.data,
    supabase: auth.actor.supabase,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
  return NextResponse.json({ link: result.link }, { status: 201 });
}
