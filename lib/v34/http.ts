import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { z } from 'zod';
import { getDashboardUser, type DashboardUser } from '@/lib/cms/auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { slugify } from '@/lib/validation';
import {
  authorize,
  authorizedClassificationsForActor,
  requireAuthorized,
  type AuthzCapability,
  type AuthzResource,
} from './authz';
import { getOptionalAuthSupabase, SupabasePersistenceError } from './supabase-sync';

export { authorize, authorizedClassificationsForActor, requireAuthorized };
export type { AuthzCapability, AuthzResource };

export function handleV34Error(err: unknown): NextResponse {
  if (err instanceof SupabasePersistenceError) {
    return NextResponse.json(
      {
        error: err.message,
        code: err.code,
        operation: err.operation,
      },
      { status: err.status },
    );
  }
  const message = err instanceof Error ? err.message : 'Unexpected server error.';
  return NextResponse.json({ error: message, code: 'INTERNAL_ERROR' }, { status: 500 });
}

export interface ContributorIdentity {
  id: string;
  handle: string;
  name: string;
  email: string;
  isEditor: boolean;
  mode: 'local' | 'supabase';
  supabase: SupabaseClient | null;
}

export type ContributorGate =
  | { ok: true; actor: ContributorIdentity }
  | { ok: false; response: NextResponse };

export async function requireContributor(): Promise<ContributorGate> {
  if (!isSupabaseConfigured) {
    return {
      ok: true,
      actor: {
        id: 'local-contributor',
        handle: 'local-researcher',
        name: 'Local Researcher',
        email: 'researcher@local.invalid',
        isEditor: true,
        mode: 'local',
        supabase: null,
      },
    };
  }

  const user: DashboardUser | null = await getDashboardUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Sign in to create or manage research contributions.' },
        { status: 401 },
      ),
    };
  }

  const supabase = await getOptionalAuthSupabase();
  const rawHandle = user.email?.split('@')[0] || user.name || user.id.slice(0, 8);
  return {
    ok: true,
    actor: {
      id: user.id,
      handle: slugify(rawHandle) || user.id.slice(0, 12),
      name: user.name || rawHandle,
      email: user.email,
      isEditor: user.isEditor,
      mode: 'supabase',
      supabase,
    },
  };
}

export async function enforceRateLimit(
  request: Request | undefined,
  scope: string,
  limit = 30,
  windowMs = 60_000,
): Promise<NextResponse | null> {
  if (!request) return null;
  const outcome = await rateLimit(clientKey(request, scope), limit, windowMs);
  if (!outcome.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down and try again.' },
      { status: 429, headers: { 'Retry-After': String(outcome.retryAfter) } },
    );
  }
  return null;
}

export async function parseJsonBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 }),
    };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join('.') || 'body';
      fieldErrors[path] = issue.message;
    }
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Validation failed.', fieldErrors },
        { status: 400 },
      ),
    };
  }
  return { ok: true, data: parsed.data };
}
