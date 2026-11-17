import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isV34FlagEnabled } from '@/lib/v34/feature-flags';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { runWithIdempotency } from '@/lib/v34/idempotency';
import {
  AssignTopicInputSchema,
  CreateTopicInputSchema,
} from '@/lib/v34/wave5-contracts';
import {
  assignTopicToTarget,
  createTopic,
  listTopics,
} from '@/lib/v34/wave5-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TopicPostUnionSchema = z.union([
  z.object({
    action: z.literal('assign'),
    ...AssignTopicInputSchema.shape,
  }),
  z.object({
    action: z.literal('create').optional(),
    ...CreateTopicInputSchema.shape,
  }),
]);

export async function GET(request: Request) {
  if (!isV34FlagEnabled('v34-topics-taxonomy')) {
    return NextResponse.json({ topics: [], total: 0, flagDisabled: true });
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
  const targetType = url.searchParams.get('targetType')?.trim() ?? '';

  let topics = await listTopics();
  if (q) {
    topics = topics.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q),
    );
  }
  if (targetType) {
    topics = topics.filter((t) => t.assignments.some((a) => a.targetType === targetType));
  }

  return NextResponse.json({ topics, total: topics.length });
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-topics-write', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, TopicPostUnionSchema);
  if (!parsed.ok) return parsed.response;

  return runWithIdempotency(
    request,
    { scope: 'POST:/api/topics', actorId: auth.actor.id, payloadHashInput: parsed.data },
    async () => {
      if (parsed.data.action === 'assign') {
        const result = await assignTopicToTarget({
          topicId: parsed.data.topicId,
          targetType: parsed.data.targetType,
          targetId: parsed.data.targetId,
          actorId: auth.actor.id,
          supabase: auth.actor.supabase,
        });
        if (!result.ok) {
          return NextResponse.json({ error: result.message }, { status: result.status });
        }
        return NextResponse.json({ assignment: result.assignment }, { status: 201 });
      }

      const result = await createTopic({
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description,
        parentTopicId: parsed.data.parentTopicId,
        actorId: auth.actor.id,
        supabase: auth.actor.supabase,
      });
      return NextResponse.json(
        { topic: result.topic, created: result.created },
        { status: result.created ? 201 : 200 },
      );
    },
  );
}
