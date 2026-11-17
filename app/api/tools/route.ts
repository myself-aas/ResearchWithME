import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { runWithIdempotency } from '@/lib/v34/idempotency';
import { RegisterToolRepositoryInputSchema } from '@/lib/v34/wave3-contracts';
import { listToolRepositories, registerToolRepository } from '@/lib/v34/wave3-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q') ?? undefined;
  const topic = url.searchParams.get('topic') ?? undefined;

  const tools = await listToolRepositories({ query, topic });
  return NextResponse.json({ tools, total: tools.length });
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-tools-write', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, RegisterToolRepositoryInputSchema);
  if (!parsed.ok) return parsed.response;

  return runWithIdempotency(
    request,
    { scope: 'v34-tools-register', actorId: auth.actor.id, payloadHashInput: parsed.data },
    async () => {
      const result = await registerToolRepository({
        ...parsed.data,
        actorId: auth.actor.id,
        supabase: auth.actor.supabase,
      });

      return NextResponse.json(result, { status: result.created ? 201 : 200 });
    },
  );
}
