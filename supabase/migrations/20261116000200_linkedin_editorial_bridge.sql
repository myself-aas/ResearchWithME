-- Hardened LinkedIn editorial automation bridge & post deduplication ledger.
--
-- Follows the repository's zero-service-role pattern (see
-- 20261113000300_billing.sql and 20261114000200_api_keys.sql):
--   * No SUPABASE_SERVICE_ROLE_KEY is shipped in the Worker runtime.
--   * Background jobs (webhook + cron) authenticate via LINKEDIN_BRIDGE_SECRET
--     compared against SHA-256 hash stored in private.linkedin_settings.
--   * Interactive admin routes authenticate via the signed-in session's
--     public.is_editor_in_chief() role.
--   * public.linkedin_posts durably tracks editorial posts already shared to
--     LinkedIn so cron retries never re-post the archive.
--
-- Idempotent: safe to re-run.

begin;

-- ---------------------------------------------------------------------------
-- 1. Durable LinkedIn post deduplication ledger (editorial posts only)
-- ---------------------------------------------------------------------------

create table if not exists public.linkedin_posts (
  post_slug text primary key,
  post_id bigint references public.posts (id) on delete set null,
  status text not null default 'posted',
  linkedin_post_urn text,
  error text,
  posted_at timestamptz,
  updated_at timestamptz not null default now(),

  constraint linkedin_posts_status_allowed check (status in ('pending', 'posted', 'failed')),
  constraint linkedin_posts_slug_length check (char_length(post_slug) between 1 and 200)
);

create index if not exists idx_linkedin_posts_status_updated
  on public.linkedin_posts (status, updated_at desc);

alter table public.linkedin_posts enable row level security;

drop policy if exists "Editor-in-Chief can view linkedin posts" on public.linkedin_posts;
create policy "Editor-in-Chief can view linkedin posts"
  on public.linkedin_posts for select
  to authenticated
  using ((select public.is_editor_in_chief()));

revoke all on public.linkedin_posts from anon, authenticated;
grant select on public.linkedin_posts to authenticated;

-- Narrow linkedin_events read policy to Editor-in-Chief now that
-- public.is_editor_in_chief() exists (created in 20261116000100).
drop policy if exists "Editors can view linkedin events" on public.linkedin_events;
drop policy if exists "Editor-in-Chief can view linkedin events" on public.linkedin_events;
create policy "Editor-in-Chief can view linkedin events"
  on public.linkedin_events for select
  to authenticated
  using ((select public.is_editor_in_chief()));

-- ---------------------------------------------------------------------------
-- 2. Bridge secret table & verifier
-- ---------------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from anon, authenticated;

create table if not exists private.linkedin_settings (
  key text primary key,
  value text not null
);

revoke all on private.linkedin_settings from anon, authenticated;

-- Provisioning (owner SQL editor):
--   printf %s "$LINKEDIN_BRIDGE_SECRET" | shasum -a 256
--   insert into private.linkedin_settings (key, value)
--   values ('bridge_secret_sha256', '<hex>')
--   on conflict (key) do update set value = excluded.value;

create or replace function public.linkedin_secret_matches(candidate text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected text;
begin
  select value into expected
    from private.linkedin_settings
   where key = 'bridge_secret_sha256';

  if expected is null or expected = '' then
    return false;
  end if;
  if candidate is null or candidate = '' then
    return false;
  end if;

  return sha256(convert_to(candidate, 'UTF8')) = decode(expected, 'hex');
end;
$$;

revoke all on function public.linkedin_secret_matches(text) from public;

create or replace function public.linkedin_caller_authorized(p_secret text default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and public.is_editor_in_chief() then
    return true;
  end if;
  return public.linkedin_secret_matches(p_secret);
end;
$$;

revoke all on function public.linkedin_caller_authorized(text) from public;

-- ---------------------------------------------------------------------------
-- 3. SECURITY DEFINER RPCs for tokens, events, and post deduplication
-- ---------------------------------------------------------------------------

create or replace function public.linkedin_get_tokens(p_secret text default null)
returns table (
  access_token text,
  refresh_token text,
  expires_at bigint,
  scope text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.linkedin_caller_authorized(p_secret) then
    raise exception 'linkedin_bridge_unauthorized' using errcode = '28000';
  end if;

  return query
    select t.access_token, t.refresh_token, t.expires_at, t.scope, t.updated_at
      from public.linkedin_tokens t
     where t.id = 'default'
     limit 1;
end;
$$;

revoke all on function public.linkedin_get_tokens(text) from public;
grant execute on function public.linkedin_get_tokens(text) to anon, authenticated;

create or replace function public.linkedin_save_tokens(
  p_access_token text,
  p_refresh_token text,
  p_expires_at bigint,
  p_scope text,
  p_secret text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.linkedin_caller_authorized(p_secret) then
    raise exception 'linkedin_bridge_unauthorized' using errcode = '28000';
  end if;

  insert into public.linkedin_tokens (id, access_token, refresh_token, expires_at, scope, updated_at)
  values ('default', p_access_token, p_refresh_token, p_expires_at, p_scope, now())
  on conflict (id) do update
    set access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        expires_at = excluded.expires_at,
        scope = excluded.scope,
        updated_at = now();
end;
$$;

revoke all on function public.linkedin_save_tokens(text, text, bigint, text, text) from public;
grant execute on function public.linkedin_save_tokens(text, text, bigint, text, text) to anon, authenticated;

create or replace function public.linkedin_delete_tokens(p_secret text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.linkedin_caller_authorized(p_secret) then
    raise exception 'linkedin_bridge_unauthorized' using errcode = '28000';
  end if;

  delete from public.linkedin_tokens where id = 'default';
end;
$$;

revoke all on function public.linkedin_delete_tokens(text) from public;
grant execute on function public.linkedin_delete_tokens(text) to anon, authenticated;

create or replace function public.linkedin_log_event(
  p_type text,
  p_slug text default null,
  p_status text default 'started',
  p_post_urn text default null,
  p_error text default null,
  p_details jsonb default null,
  p_secret text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.linkedin_caller_authorized(p_secret) then
    raise exception 'linkedin_bridge_unauthorized' using errcode = '28000';
  end if;

  insert into public.linkedin_events (type, slug, status, post_urn, error, details, created_at)
  values (p_type, p_slug, p_status, p_post_urn, p_error, p_details, now());
end;
$$;

revoke all on function public.linkedin_log_event(text, text, text, text, text, jsonb, text) from public;
grant execute on function public.linkedin_log_event(text, text, text, text, text, jsonb, text) to anon, authenticated;

create or replace function public.linkedin_get_metrics(
  p_since timestamptz,
  p_secret text default null
)
returns table (
  type text,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.linkedin_caller_authorized(p_secret) then
    raise exception 'linkedin_bridge_unauthorized' using errcode = '28000';
  end if;

  return query
    select e.type, e.status, e.created_at
      from public.linkedin_events e
     where e.type = 'post_attempt'
       and e.created_at >= p_since
     order by e.created_at desc
     limit 1000;
end;
$$;

revoke all on function public.linkedin_get_metrics(timestamptz, text) from public;
grant execute on function public.linkedin_get_metrics(timestamptz, text) to anon, authenticated;

create or replace function public.linkedin_list_posted_slugs(p_secret text default null)
returns table (post_slug text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.linkedin_caller_authorized(p_secret) then
    raise exception 'linkedin_bridge_unauthorized' using errcode = '28000';
  end if;

  return query
    select lp.post_slug
      from public.linkedin_posts lp
     where lp.status = 'posted';
end;
$$;

revoke all on function public.linkedin_list_posted_slugs(text) from public;
grant execute on function public.linkedin_list_posted_slugs(text) to anon, authenticated;

create or replace function public.linkedin_record_post_status(
  p_slug text,
  p_status text,
  p_post_urn text default null,
  p_error text default null,
  p_secret text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  matched_post_id bigint;
begin
  if not public.linkedin_caller_authorized(p_secret) then
    raise exception 'linkedin_bridge_unauthorized' using errcode = '28000';
  end if;

  select p.id into matched_post_id
    from public.posts p
   where p.slug = p_slug
   limit 1;

  insert into public.linkedin_posts (post_slug, post_id, status, linkedin_post_urn, error, posted_at, updated_at)
  values (
    p_slug,
    matched_post_id,
    p_status,
    p_post_urn,
    p_error,
    case when p_status = 'posted' then now() else null end,
    now()
  )
  on conflict (post_slug) do update
    set post_id = coalesce(excluded.post_id, public.linkedin_posts.post_id),
        status = excluded.status,
        linkedin_post_urn = coalesce(excluded.linkedin_post_urn, public.linkedin_posts.linkedin_post_urn),
        error = excluded.error,
        posted_at = coalesce(excluded.posted_at, public.linkedin_posts.posted_at),
        updated_at = now();
end;
$$;

revoke all on function public.linkedin_record_post_status(text, text, text, text, text) from public;
grant execute on function public.linkedin_record_post_status(text, text, text, text, text) to anon, authenticated;

commit;
