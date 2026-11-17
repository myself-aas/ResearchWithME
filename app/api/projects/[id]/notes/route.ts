import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import {
  CreateProjectNoteInputSchema,
  UpdateProjectNoteInputSchema,
} from '@/lib/v34/wave3-contracts';
import { createProjectNote, listProjectNotes, updateProjectNote } from '@/lib/v34/wave3-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const notes = await listProjectNotes(id);
  return NextResponse.json({ notes, total: notes.length });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-project-notes-write', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, CreateProjectNoteInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const note = await createProjectNote({
    projectIdOrSlug: id,
    ...parsed.data,
    actorId: auth.actor.id,
    actorName: auth.actor.name,
    supabase: auth.actor.supabase,
  });
  if (!note) {
    return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  }
  return NextResponse.json({ note }, { status: 201 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-project-notes-patch', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, UpdateProjectNoteInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const note = await updateProjectNote({
    projectIdOrSlug: id,
    ...parsed.data,
    supabase: auth.actor.supabase,
  });
  if (!note) {
    return NextResponse.json({ error: 'Project or note not found.' }, { status: 404 });
  }
  return NextResponse.json({ note });
}
