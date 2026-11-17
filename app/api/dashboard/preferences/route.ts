import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import {
  NON_SUPPRESSIBLE_NOTIFICATION_CATEGORIES,
  resolveEffectiveNotificationPolicy,
} from '@/lib/v34/notifications-safe';
import { UpdateDashboardPreferencesInputSchema } from '@/lib/v34/wave3-contracts';
import { getDashboardPreferences, updateDashboardPreferences } from '@/lib/v34/wave3-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const preferences = getDashboardPreferences(auth.actor.id);
  return NextResponse.json({
    preferences,
    nonSuppressibleChannels: NON_SUPPRESSIBLE_NOTIFICATION_CATEGORIES,
    mandatoryPolicies: NON_SUPPRESSIBLE_NOTIFICATION_CATEGORIES.map((category) =>
      resolveEffectiveNotificationPolicy({
        category,
        digestOff: preferences.digestFrequency === 'off',
      }),
    ),
  });
}

export async function PATCH(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-dashboard-prefs', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, UpdateDashboardPreferencesInputSchema);
  if (!parsed.ok) return parsed.response;

  const preferences = await updateDashboardPreferences({
    userId: auth.actor.id,
    ...parsed.data,
    supabase: auth.actor.supabase,
  });

  return NextResponse.json({
    preferences,
    nonSuppressibleChannels: NON_SUPPRESSIBLE_NOTIFICATION_CATEGORIES,
  });
}
