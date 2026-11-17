import { NextResponse } from 'next/server';
import { getDashboardUser } from '@/lib/cms/auth';
import {
  CONTRIBUTION_TYPES,
  CreateContributionInputSchema,
  serializeResearchDocumentToMdx,
  type ContributionType,
} from '@/lib/v34/contracts';
import {
  enforceRateLimit,
  handleV34Error,
  parseJsonBody,
  requireAuthorized,
  requireContributor,
} from '@/lib/v34/http';
import { runWithIdempotency } from '@/lib/v34/idempotency';
import { validateAndSanitizeMdx } from '@/lib/v34/mdx-security';
import { createContribution, listContributions, persistContributionToSupabase } from '@/lib/v34/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawType = url.searchParams.get('type') ?? 'all';
  const type =
    rawType === 'all' || (CONTRIBUTION_TYPES as readonly string[]).includes(rawType)
      ? (rawType as ContributionType | 'all')
      : 'all';
  const topic = url.searchParams.get('topic') ?? undefined;
  const query = url.searchParams.get('q') ?? undefined;
  const authorHandle = url.searchParams.get('author') ?? undefined;
  const user = await getDashboardUser();

  const contributions = listContributions({
    includeDraftsForAuthorId: user?.id ?? null,
    type,
    topic,
    query,
    authorHandle,
  });

  return NextResponse.json({ contributions, total: contributions.length });
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-contributions-write', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, CreateContributionInputSchema);
  if (!parsed.ok) return parsed.response;

  const candidateMdx = parsed.data.document
    ? serializeResearchDocumentToMdx(parsed.data.document)
    : '';
  const mdxCheck = validateAndSanitizeMdx(candidateMdx);
  if (!mdxCheck.safe) {
    return NextResponse.json(
      {
        error: 'MDX document violated scholarly security allowlist (Part V §16.2).',
        violations: mdxCheck.violations,
      },
      { status: 400 },
    );
  }

  const authz = requireAuthorized(auth.actor, 'contribution:write', {
    kind: 'contribution',
    ownerId: auth.actor.id,
    classification: 'PUBLIC',
  });
  if (!authz.ok) return authz.response;

  return runWithIdempotency(
    request,
    {
      scope: 'v34-contributions-create',
      actorId: auth.actor.id,
      payloadHashInput: parsed.data,
      supabase: auth.actor.supabase,
    },
    async () => {
      try {
        const contribution = createContribution({
          ...parsed.data,
          authorId: auth.actor.id,
          authorHandle: auth.actor.handle,
          authorName: auth.actor.name,
        });

        await persistContributionToSupabase(auth.actor.supabase, contribution);
        return NextResponse.json({ contribution }, { status: 201 });
      } catch (err) {
        return handleV34Error(err);
      }
    },
  );
}
