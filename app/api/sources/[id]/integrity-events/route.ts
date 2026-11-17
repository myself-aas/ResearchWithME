import { NextResponse } from 'next/server';
import { requireEditor } from '@/lib/cms/auth';
import { CreateIntegrityEventInputSchema } from '@/lib/v34/contracts';
import { enforceRateLimit, parseJsonBody } from '@/lib/v34/http';
import { recordIntegrityEvent } from '@/lib/v34/store';
import { propagateIntegrityEventToAttention } from '@/lib/v34/wave3-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-integrity-events', 15, 60_000);
  if (limited) return limited;

  const gate = await requireEditor();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const parsed = await parseJsonBody(request, CreateIntegrityEventInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const result = await recordIntegrityEvent({
    sourceId: id,
    ...parsed.data,
    recordedBy: gate.user?.id ?? 'local-editor',
  });

  if (!result) {
    return NextResponse.json({ error: 'Source not found.' }, { status: 404 });
  }

  const propagatedAttention = await propagateIntegrityEventToAttention({
    sourceId: result.source.id,
    sourceTitle: result.source.title,
    status: result.event.status,
    summary: result.event.summary,
    affectedContributionIds: result.affectedContributionIds,
    recipientUserIds: result.affectedAuthorIds,
  });

  return NextResponse.json(
    {
      ...result,
      propagatedAttentionCount: propagatedAttention.length,
    },
    { status: 201 },
  );
}
