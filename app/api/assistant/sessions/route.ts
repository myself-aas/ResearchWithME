import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { CreateAssistantSessionInputSchema } from '@/lib/v34/wave8-contracts';
import { createAssistantSession } from '@/lib/v34/wave8-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-assistant-session-create', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, CreateAssistantSessionInputSchema);
  if (!parsed.ok) return parsed.response;

  const session = await createAssistantSession({
    userId: auth.actor.id,
    title: parsed.data.title,
    workspaceId: parsed.data.workspaceId,
    dataClassification: parsed.data.dataClassification,
    contextSourceIds: parsed.data.contextSourceIds,
    supabase: auth.actor.supabase,
  });
  return NextResponse.json({ session }, { status: 201 });
}
