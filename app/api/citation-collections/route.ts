import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isV34FlagEnabled } from '@/lib/v34/feature-flags';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { runWithIdempotency } from '@/lib/v34/idempotency';
import {
  AddCitationCollectionItemInputSchema,
  CreateCitationCollectionInputSchema,
} from '@/lib/v34/wave5-contracts';
import {
  addCitationCollectionItem,
  createCitationCollection,
  deleteCitationCollection,
  listCitationCollections,
} from '@/lib/v34/wave5-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CollectionPostUnionSchema = z.union([
  z.object({
    action: z.literal('add-item'),
    collectionId: z.string().trim().min(1).max(120),
    sourceId: z.string().trim().min(1).max(120).optional().nullable(),
    contributionId: z.string().trim().min(1).max(120).optional().nullable(),
    evidenceId: z.string().trim().min(1).max(120).optional().nullable(),
    note: z.string().trim().max(500).default(''),
  }),
  z.object({
    action: z.literal('create').optional(),
    ...CreateCitationCollectionInputSchema.shape,
  }),
]);

export async function GET() {
  if (!isV34FlagEnabled('v34-citation-collections')) {
    return NextResponse.json({ collections: [], total: 0, flagDisabled: true });
  }
  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const collections = listCitationCollections(auth.actor.id);
  return NextResponse.json({ collections, total: collections.length });
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-citation-collections-write', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, CollectionPostUnionSchema);
  if (!parsed.ok) return parsed.response;

  return runWithIdempotency(
    request,
    {
      scope: 'POST:/api/citation-collections',
      actorId: auth.actor.id,
      payloadHashInput: parsed.data,
    },
    async () => {
      if (parsed.data.action === 'add-item') {
        const validatedItem = AddCitationCollectionItemInputSchema.safeParse(parsed.data);
        if (!validatedItem.success) {
          return NextResponse.json(
            {
              error: validatedItem.error.issues[0]?.message ?? 'Invalid citation collection item.',
              code: 'EXACTLY_ONE_TARGET_REQUIRED',
            },
            { status: 400 },
          );
        }
        const result = await addCitationCollectionItem({
          userId: auth.actor.id,
          ...validatedItem.data,
          supabase: auth.actor.supabase,
        });
        if (!result.ok) {
          return NextResponse.json(
            { error: result.message, code: result.code },
            { status: result.status },
          );
        }
        return NextResponse.json(
          { item: result.item, collection: result.collection },
          { status: 201 },
        );
      }

      const collection = await createCitationCollection({
        userId: auth.actor.id,
        workspaceId: parsed.data.workspaceId,
        name: parsed.data.name,
        description: parsed.data.description,
        visibility: parsed.data.visibility,
        supabase: auth.actor.supabase,
      });
      return NextResponse.json({ collection }, { status: 201 });
    },
  );
}

export async function DELETE(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-citation-collections-delete', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const id = url.searchParams.get('id')?.trim();
  if (!id) {
    return NextResponse.json({ error: 'Query parameter id is required.' }, { status: 400 });
  }
  const removed = await deleteCitationCollection({
    userId: auth.actor.id,
    id,
    supabase: auth.actor.supabase,
  });
  if (!removed) {
    return NextResponse.json({ error: 'Citation collection not found.' }, { status: 404 });
  }
  return NextResponse.json({ removed: true, id });
}
