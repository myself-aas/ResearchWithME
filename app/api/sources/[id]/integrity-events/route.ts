import { NextResponse } from 'next/server';
import { requireEditor } from '@/lib/cms/auth';
import { CreateIntegrityEventInputSchema } from '@/lib/v34/contracts';
import { enforceRateLimit, handleV34Error, parseJsonBody, requireAuthorized } from '@/lib/v34/http';
import { recordIntegrityEvent } from '@/lib/v34/store';
import { getOptionalAuthSupabase } from '@/lib/v34/supabase-sync';
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

  const authz = requireAuthorized(
    {
      id: gate.user?.id ?? 'local-editor',
      isEditor: true,
      mode: gate.mode === 'supabase' ? 'supabase' : 'local',
    },
    'source:integrity:write',
    { kind: 'source', classification: 'PUBLIC' },
  );
  if (!authz.ok) return authz.response;

  const parsed = await parseJsonBody(request, CreateIntegrityEventInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const supabase = gate.mode === 'supabase' ? (await getOptionalAuthSupabase()) ?? undefined : undefined;

  try {
    const result = await recordIntegrityEvent({
      sourceId: id,
      ...parsed.data,
      recordedBy: gate.user?.id ?? 'local-editor',
      supabase,
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
      supabase,
    });

    return NextResponse.json(
      {
        ...result,
        propagatedAttentionCount: propagatedAttention.length,
      },
      { status: 201 },
    );
  } catch (err) {
    return handleV34Error(err);
  }
}
