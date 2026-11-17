import { NextResponse } from 'next/server';
import { CreateRelationshipInputSchema } from '@/lib/v34/contracts';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { toProvenanceGraphData } from '@/lib/v34/scholarly-adapter';
import {
  getClaimEvidenceLinks,
  linkClaimEvidence,
  linkContributionObject,
  listClaims,
  listContributions,
  listEvidence,
  listSources,
  persistClaimEvidenceToSupabase,
  updateClaimEvidenceStatus,
} from '@/lib/v34/store';
import { UpdateClaimEvidenceStatusInputSchema } from '@/lib/v34/wave2-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const claimId = new URL(request.url).searchParams.get('claimId') ?? undefined;
  const [sources, evidence, claims, contributions] = await Promise.all([
    listSources(),
    Promise.resolve(listEvidence()),
    Promise.resolve(listClaims()),
    Promise.resolve(listContributions()),
  ]);
  const claimEvidence = getClaimEvidenceLinks(claimId);
  const graph = toProvenanceGraphData({
    sources,
    evidence,
    claims,
    claimEvidence,
    contributions,
  });

  return NextResponse.json({
    graph,
    claimEvidence,
    totalNodes: graph.objects.length,
    totalEdges: graph.relationships.length,
  });
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-relationships-write', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, CreateRelationshipInputSchema);
  if (!parsed.ok) return parsed.response;

  if (parsed.data.kind === 'claim-evidence') {
    const result = linkClaimEvidence({
      claimId: parsed.data.claimId,
      evidenceId: parsed.data.evidenceId,
      relationship: parsed.data.relationship,
      assertionMethod: parsed.data.assertionMethod,
      confidence: parsed.data.confidence,
      rationale: parsed.data.rationale,
      assertedBy: auth.actor.id,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }
    await persistClaimEvidenceToSupabase(auth.actor.supabase, result.link);
    return NextResponse.json({ relationship: result.link }, { status: 201 });
  }

  if (parsed.data.kind === 'contribution-evidence') {
    const result = linkContributionObject(parsed.data.contributionId, {
      evidenceId: parsed.data.evidenceId,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }
    return NextResponse.json({ contribution: result.contribution }, { status: 201 });
  }

  const result = linkContributionObject(parsed.data.contributionId, {
    claimId: parsed.data.claimId,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json({ contribution: result.contribution }, { status: 201 });
}

export async function PATCH(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-relationships-curate', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, UpdateClaimEvidenceStatusInputSchema);
  if (!parsed.ok) return parsed.response;

  const result = updateClaimEvidenceStatus(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 404 });
  }
  await persistClaimEvidenceToSupabase(auth.actor.supabase, result.link);
  return NextResponse.json({ relationship: result.link });
}
