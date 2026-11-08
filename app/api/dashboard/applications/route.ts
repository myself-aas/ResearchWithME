import { NextResponse } from 'next/server';
import { getDashboardUser } from '@/lib/cms/auth';
import { isSameOrigin, noStoreHeaders, readJsonBody } from '@/lib/cms/http';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { cleanText } from '@/lib/validation';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { APPLICATION_PROVIDERS, applicationErrorMessage, type ApplicationProvider } from '@/lib/applications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GENERIC_ERROR = 'The application service could not be reached. Try again in a moment.';

/**
 * Readers see their own application; editors see the whole queue. Row-level
 * security enforces the same split, so this only chooses the ordering.
 */
export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: 'Applications need Supabase. Configure it to accept writer requests.' },
      { status: 503 },
    );
  }

  const user = await getDashboardUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to view your application.' }, { status: 401 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('author_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return NextResponse.json({ applications: data ?? [] }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error('Could not read author applications:', error);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-site requests are not allowed.' }, { status: 403 });
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: 'Applications need Supabase. Configure it to accept writer requests.' },
      { status: 503 },
    );
  }

  const user = await getDashboardUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in before applying to write.' }, { status: 401 });
  }

  const limit = await rateLimit(clientKey(request, 'author:apply'), 5, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Wait a minute before applying again.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.retryAfter / 1000)) } },
    );
  }

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const input = (body.value ?? {}) as Record<string, unknown>;
  const provider = String(input.provider ?? '').trim().toLowerCase();
  const handle = cleanText(String(input.handle ?? ''), 160);
  const displayName = cleanText(String(input.displayName ?? user.name), 120);
  const statement = cleanText(String(input.statement ?? ''), 1000);

  if (!APPLICATION_PROVIDERS.includes(provider as ApplicationProvider)) {
    return NextResponse.json(
      { error: 'Connect a GitHub or ORCID identity before applying.' },
      { status: 400 },
    );
  }
  if (!handle) {
    return NextResponse.json(
      { error: 'The application needs the handle from the connected identity.' },
      { status: 400 },
    );
  }
  if (!displayName) {
    return NextResponse.json({ error: 'Add the name to publish under.' }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('apply_as_author', {
      p_provider: provider,
      p_handle: handle,
      p_display_name: displayName,
      p_statement: statement,
    });

    if (error) {
      return NextResponse.json({ error: applicationErrorMessage(error.message) }, { status: 400 });
    }
    return NextResponse.json({ application: data }, { status: 201, headers: noStoreHeaders() });
  } catch (error) {
    console.error('Could not record the author application:', error);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 503 });
  }
}
