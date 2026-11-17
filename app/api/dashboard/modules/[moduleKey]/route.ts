import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import {
  DASHBOARD_MODULE_KEYS,
  UpdateDashboardModuleInputSchema,
  type DashboardModuleKey,
} from '@/lib/v34/wave7-contracts';
import { getDashboardModules, updateDashboardModule } from '@/lib/v34/wave7-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ moduleKey: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-dashboard-module', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { moduleKey } = await context.params;
  if (!(DASHBOARD_MODULE_KEYS as readonly string[]).includes(moduleKey)) {
    return NextResponse.json(
      {
        error: `Unknown dashboard moduleKey "${moduleKey}". Allowed: ${DASHBOARD_MODULE_KEYS.join(', ')}.`,
      },
      { status: 400 },
    );
  }

  const parsed = await parseJsonBody(request, UpdateDashboardModuleInputSchema);
  if (!parsed.ok) return parsed.response;

  const updated = updateDashboardModule({
    userId: auth.actor.id,
    moduleKey: moduleKey as DashboardModuleKey,
    ...parsed.data,
  });

  return NextResponse.json({
    module: updated,
    modules: getDashboardModules(auth.actor.id),
  });
}
