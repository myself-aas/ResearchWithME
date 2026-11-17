import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { CreateAssistantMessageInputSchema } from '@/lib/v34/wave8-contracts';
import { postAssistantSessionMessage } from '@/lib/v34/wave8-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-assistant-msg-create', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, CreateAssistantMessageInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const result = await postAssistantSessionMessage({
    sessionId: id,
    userId: auth.actor.id,
    content: parsed.data.content,
    provider: parsed.data.provider,
    model: parsed.data.model,
    sourceIds: parsed.data.sourceIds,
    supabase: auth.actor.supabase,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.message, code: result.code }, { status: result.status });
  }
  return NextResponse.json(
    {
      userMessage: result.userMessage,
      assistantMessage: result.assistantMessage,
      provenanceId: result.provenanceId,
    },
    { status: 201 },
  );
}
