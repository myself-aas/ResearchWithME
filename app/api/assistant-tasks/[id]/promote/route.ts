import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { runWithIdempotency } from '@/lib/v34/idempotency';
import { PromoteAssistantTaskInputSchema } from '@/lib/v34/wave3-contracts';
import { promoteAssistantTaskToAttention } from '@/lib/v34/wave3-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-assistant-tasks-promote', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const text = await request.text();
  let body: { explanation?: string; severity: 'INFO' | 'WARNING' | 'CRITICAL' } = { severity: 'INFO' };
  if (text.trim()) {
    const parsed = await parseJsonBody(
      new Request(request.url, { method: 'POST', body: text, headers: request.headers }),
      PromoteAssistantTaskInputSchema,
    );
    if (!parsed.ok) return parsed.response;
    body = parsed.data;
  }

  const { id } = await context.params;
  return runWithIdempotency(
    request,
    { scope: `v34-assistant-promote:${id}`, actorId: auth.actor.id, payloadHashInput: body },
    async () => {
      const result = await promoteAssistantTaskToAttention({
        userId: auth.actor.id,
        taskId: id,
        explanation: body.explanation,
        severity: body.severity,
        supabase: auth.actor.supabase,
      });

      if (!result.ok) {
        return NextResponse.json({ error: result.message }, { status: result.status });
      }
      return NextResponse.json(
        { task: result.task, attentionItem: result.attentionItem },
        { status: 201 },
      );
    },
  );
}
