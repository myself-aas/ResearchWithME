import { NextResponse } from 'next/server';
import { ResolveSourceInputSchema } from '@/lib/v34/contracts';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { resolveOrCreateSource } from '@/lib/v34/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-sources-resolve', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, ResolveSourceInputSchema);
  if (!parsed.ok) return parsed.response;

  const resolved = await resolveOrCreateSource({
    ...parsed.data,
    userId: auth.actor.id,
    supabase: auth.actor.supabase ?? undefined,
  });

  return NextResponse.json(resolved, { status: resolved.created ? 201 : 200 });
}
