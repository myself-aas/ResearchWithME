import { NextResponse } from 'next/server';
import { requireEditor } from '@/lib/cms/auth';
import { isSameOrigin, noStoreHeaders, readJsonBody } from '@/lib/cms/http';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cleanText } from '@/lib/validation';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { applicationErrorMessage } from '@/lib/applications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GENERIC_ERROR = 'The application service could not be reached. Try again in a moment.';

/**
 * Approve or reject a writer application. Editor only, and the approval itself
 * writes the `public.editors` row inside `review_author_application`, so a
 * reviewer cannot grant access to an arbitrary account — only to the applicant
 * the database resolved from the application id.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-site requests are not allowed.' }, { status: 403 });
  }

  const gate = await requireEditor();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const limit = await rateLimit(clientKey(request, 'author:review'), 30, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many review actions. Wait a minute before continuing.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  const { id } = await params;
  const applicationId = Number.parseInt(id, 10);
  if (!Number.isFinite(applicationId) || applicationId <= 0) {
    return NextResponse.json({ error: 'That application does not exist.' }, { status: 400 });
  }

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const input = (body.value ?? {}) as Record<string, unknown>;
  const approve = input.approve === true;
  const note = cleanText(String(input.note ?? ''), 500);

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('review_author_application', {
      p_id: applicationId,
      p_approve: approve,
      p_note: note,
    });

    if (error) {
      return NextResponse.json({ error: applicationErrorMessage(error.message) }, { status: 400 });
    }
    return NextResponse.json({ application: data }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error('Could not review the author application:', error);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 503 });
  }
}
