import type { RequestContext } from '../context';
import { isPublicConfigValid, rateLimit } from '../context';
import {
  clientKey,
  isSameOrigin,
  noStoreHeaders,
  readJsonBody,
} from '../http';
import { json, type ApiRoute, type ApiHandler } from './registry';
import { createSupabaseServerClient, getDashboardUser, requireEditor } from '../auth';
import { cleanText } from '@/lib/validation';
import {
  APPLICATION_PROVIDERS,
  applicationErrorMessage,
  type ApplicationProvider,
} from '@/lib/applications';

const GENERIC_ERROR = 'The application service could not be reached. Try again in a moment.';
const NEEDS_SUPABASE =
  'Applications need Supabase. Configure it to accept writer requests.';
const badOrigin = { error: 'Cross-site requests are not allowed.' };

/**
 * The request-scoped client for applications queries/RPCs: prefer the runtime's
 * session client (cookie-bound, RLS as the caller), fall back to a locally
 * constructed one. Both paths run as the calling user, so the database — not
 * this module — decides what they may see and do.
 */
function sessionClient(ctx: RequestContext) {
  return ctx.services.sessionClient(ctx) ?? createSupabaseServerClient(ctx);
}

/**
 * Readers see their own application(s); editors see the whole queue. RLS
 * enforces the same split server-side ("Users can see their own applications"),
 * so this only chooses ordering and response shape.
 */
const listApplications: ApiHandler = async (ctx) => {
  if (!isPublicConfigValid(ctx.config)) {
    return json({ error: NEEDS_SUPABASE }, { status: 503 });
  }

  const user = await getDashboardUser(ctx);
  if (!user) {
    return json({ error: 'Sign in to view your application.' }, { status: 401 });
  }

  try {
    const supabase = sessionClient(ctx);
    const { data, error } = await supabase
      .from('author_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return json({ applications: data ?? [] }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error('Could not read author applications:', error);
    return json({ error: GENERIC_ERROR }, { status: 503 });
  }
};

const createApplication: ApiHandler = async (ctx) => {
  if (!isSameOrigin(ctx.request, ctx.config.siteUrl)) {
    return json(badOrigin, { status: 403 });
  }

  if (!isPublicConfigValid(ctx.config)) {
    return json({ error: NEEDS_SUPABASE }, { status: 503 });
  }

  const user = await getDashboardUser(ctx);
  if (!user) {
    return json({ error: 'Sign in before applying to write.' }, { status: 401 });
  }

  const limit = await rateLimit(ctx, clientKey(ctx.request, 'author:apply'), 5, 60_000);
  if (!limit.allowed) {
    return json(
      { error: 'Too many attempts. Wait a minute before applying again.' },
      { status: 429, headers: { 'retry-after': String(limit.retryAfter) } },
    );
  }

  const body = await readJsonBody(ctx.request);
  if (!body.ok) return body.response;

  const input = (body.value ?? {}) as Record<string, unknown>;
  const provider = String(input.provider ?? '').trim().toLowerCase();
  const handle = cleanText(String(input.handle ?? ''), 160);
  const displayName = cleanText(String(input.displayName ?? user.name), 120);
  const statement = cleanText(String(input.statement ?? ''), 1000);

  if (!APPLICATION_PROVIDERS.includes(provider as ApplicationProvider)) {
    return json({ error: 'Connect a GitHub or ORCID identity before applying.' }, { status: 400 });
  }
  if (!handle) {
    return json(
      { error: 'The application needs the handle from the connected identity.' },
      { status: 400 },
    );
  }
  if (!displayName) {
    return json({ error: 'Add the name to publish under.' }, { status: 400 });
  }

  try {
    const supabase = sessionClient(ctx);
    const { data, error } = await supabase.rpc('apply_as_author', {
      p_provider: provider,
      p_handle: handle,
      p_display_name: displayName,
      p_statement: statement,
    });

    if (error) {
      return json({ error: applicationErrorMessage(error.message) }, { status: 400 });
    }
    return json({ application: data }, { status: 201, headers: noStoreHeaders() });
  } catch (error) {
    console.error('Could not record the author application:', error);
    return json({ error: GENERIC_ERROR }, { status: 503 });
  }
};

/**
 * Approve or reject a writer application. Editor only, and the approval itself
 * writes the public.editors row inside review_author_application, so a
 * reviewer cannot grant access to an arbitrary account — only to the applicant
 * the database resolved from the application id.
 */
const reviewApplication: ApiHandler = async (ctx, params) => {
  if (!isSameOrigin(ctx.request, ctx.config.siteUrl)) {
    return json(badOrigin, { status: 403 });
  }

  const gate = await requireEditor(ctx);
  if (!gate.ok) return json({ error: gate.error }, { status: gate.status });

  const limit = await rateLimit(ctx, clientKey(ctx.request, 'author:review'), 30, 60_000);
  if (!limit.allowed) {
    return json(
      { error: 'Too many review actions. Wait a minute before continuing.' },
      { status: 429, headers: { 'retry-after': String(limit.retryAfter) } },
    );
  }

  const applicationId = Number.parseInt((params.id ?? '').trim(), 10);
  if (!Number.isFinite(applicationId) || applicationId <= 0) {
    return json({ error: 'That application does not exist.' }, { status: 400 });
  }

  const body = await readJsonBody(ctx.request);
  if (!body.ok) return body.response;

  const input = (body.value ?? {}) as Record<string, unknown>;
  const approve = input.approve === true;
  const note = cleanText(String(input.note ?? ''), 500);

  try {
    const supabase = sessionClient(ctx);
    const { data, error } = await supabase.rpc('review_author_application', {
      p_id: applicationId,
      p_approve: approve,
      p_note: note,
    });

    if (error) {
      return json({ error: applicationErrorMessage(error.message) }, { status: 400 });
    }
    return json({ application: data }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error('Could not review the author application:', error);
    return json({ error: GENERIC_ERROR }, { status: 503 });
  }
};

export const applicationsRoutes: ApiRoute[] = [
  {
    path: '/api/dashboard/applications',
    handlers: { GET: listApplications, POST: createApplication },
  },
  {
    path: '/api/dashboard/applications/:id',
    handlers: { POST: reviewApplication },
  },
];
