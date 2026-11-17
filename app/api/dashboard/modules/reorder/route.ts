import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { ReorderDashboardModulesInputSchema } from '@/lib/v34/wave8-contracts';
import { reorderDashboardModules } from '@/lib/v34/wave8-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-dash-modules-reorder', 25, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, ReorderDashboardModulesInputSchema);
  if (!parsed.ok) return parsed.response;

  const result = await reorderDashboardModules({
    userId: auth.actor.id,
    moduleOrder: parsed.data.moduleOrder,
    supabase: auth.actor.supabase,
  });
  return NextResponse.json(result);
}
