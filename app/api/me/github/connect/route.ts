import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { ConnectGithubInputSchema } from '@/lib/v34/wave8-contracts';
import { connectUserGithub } from '@/lib/v34/wave8-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-me-github', 10, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, ConnectGithubInputSchema);
  if (!parsed.ok) return parsed.response;

  const profile = await connectUserGithub({
    userId: auth.actor.id,
    githubHandle: parsed.data.githubHandle,
    supabase: auth.actor.supabase,
  });
  return NextResponse.json({ connected: true, githubHandle: profile.githubHandle, profile });
}
