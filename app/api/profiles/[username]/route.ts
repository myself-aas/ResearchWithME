import { NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/v34/http';
import { listContributions } from '@/lib/v34/store';
import { getRecognitionSummary } from '@/lib/v34/wave3-store';
import { getPublicProfileByUsername } from '@/lib/v34/wave7-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ username: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-profiles-get', 120, 60_000);
  if (limited) return limited;

  const { username } = await context.params;
  const profile = getPublicProfileByUsername(username);
  if (!profile) {
    return NextResponse.json({ error: 'Contributor profile not found.' }, { status: 404 });
  }

  const publicContributions = listContributions().filter(
    (c) =>
      c.lifecycle !== 'draft' &&
      (c.authorHandle.toLowerCase() === profile.username.toLowerCase() ||
        c.authorId === profile.userId),
  );
  const recognition = getRecognitionSummary(profile.userId);

  return NextResponse.json({
    profile: {
      username: profile.username,
      displayName: profile.displayName,
      bio: profile.bio,
      orcidId: profile.orcidId,
      githubHandle: profile.githubHandle,
      affiliations: profile.affiliations,
      expertise: profile.expertise,
    },
    publicContributions,
    recognition,
  });
}
