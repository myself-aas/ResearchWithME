-- Assistant API: keys, the request ledger, and monthly usage.
--
-- Design: docs/decisions/ADR-001-assistant-api-worker-and-rate-limiting.md
-- Contract: docs/assistant-api.md
--
-- Who writes what
--   api_keys           the signed-in owner, through row-level security: insert a
--                      row, read it back without the hash, set revoked_at.
--   api_requests       only the bridge functions below.
--   api_usage_periods  only the bridge functions below.
--
-- The bridge functions are `security definer` and refuse unless the caller
-- presents the API bridge secret (public.api_secret_matches, section 0). The
-- site Worker calls them with the publishable key; there is still no privileged
-- database credential in the application.
--
-- The secret is this API's own, not the billing one: a leak of either does not
-- open the other, and each can be rotated without touching the other. This
-- migration therefore does not depend on 20261113000300_billing.sql.
--
-- Idempotent: safe to run more than once.

-- ---------------------------------------------------------------------------
-- 0. The API bridge secret
-- ---------------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from anon, authenticated;

create table if not exists private.api_settings (
  key text primary key,
  value text not null
);

revoke all on private.api_settings from anon, authenticated;

-- The owner inserts the digest after this migration, using the value set as
-- the Worker secret API_BRIDGE_SECRET:
--   printf %s "$API_BRIDGE_SECRET" | shasum -a 256
--   insert into private.api_settings (key, value)
--   values ('bridge_secret_sha256', '<hex>')
--   on conflict (key) do update set value = excluded.value;
-- An absent row fails every call closed.

create or replace function public.api_secret_matches(candidate text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected text;
begin
  select value into expected
    from private.api_settings
   where key = 'bridge_secret_sha256';

  if expected is null or expected = '' then
    return false;
  end if;
  if candidate is null or candidate = '' then
    return false;
  end if;

  -- sha256(bytea) is core Postgres (11+), not pgcrypto. convert_to pins the
  -- encoding so the digest matches `printf %s "$SECRET" | shasum -a 256`.
  return sha256(convert_to(candidate, 'UTF8')) = decode(expected, 'hex');
end;
$$;

-- Only the bridge functions below call this, and they run as their owner, so no
-- client role needs to execute it directly.
revoke all on function public.api_secret_matches(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  -- First 12 characters of the key, so its owner can tell keys apart.
  prefix text not null,
  -- Lowercase hex SHA-256 of the key. The key itself is never stored.
  key_hash text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  constraint api_keys_name_length check (char_length(name) between 1 and 60),
  constraint api_keys_hash_format check (key_hash ~ '^[0-9a-f]{64}$'),
  constraint api_keys_key_hash_unique unique (key_hash)
);

create index if not exists api_keys_user_id_idx on public.api_keys (user_id);

create table if not exists public.api_requests (
  id uuid primary key default gen_random_uuid(),
  key_id uuid not null references public.api_keys (id) on delete cascade,
  user_id uuid not null,
  idempotency_key text not null,
  request_hash text not null,
  status text not null default 'claimed',
  mode text,
  response jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint api_requests_status_known check (status in ('claimed', 'completed')),
  -- The claim is atomic because of this constraint, not because of a prior select.
  constraint api_requests_idempotency_unique unique (key_id, idempotency_key)
);

create index if not exists api_requests_completed_at_idx on public.api_requests (completed_at);

create table if not exists public.api_usage_periods (
  user_id uuid not null references auth.users (id) on delete cascade,
  -- First day of the UTC month.
  period_start date not null,
  requests_used integer not null default 0,
  constraint api_usage_periods_non_negative check (requests_used >= 0),
  primary key (user_id, period_start)
);

alter table public.api_keys enable row level security;
alter table public.api_requests enable row level security;
alter table public.api_usage_periods enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Access for the key's owner
-- ---------------------------------------------------------------------------

drop policy if exists "Owners can read their own API keys" on public.api_keys;
create policy "Owners can read their own API keys"
  on public.api_keys for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Owners can create their own API keys" on public.api_keys;
create policy "Owners can create their own API keys"
  on public.api_keys for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Owners can revoke their own API keys" on public.api_keys;
create policy "Owners can revoke their own API keys"
  on public.api_keys for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Column grants do what a policy cannot: the hash is unreadable even to its
-- owner, and the only column an owner can change is revoked_at.
revoke all on public.api_keys from anon, authenticated;
grant select (id, user_id, name, prefix, created_at, last_used_at, revoked_at) on public.api_keys to authenticated;
grant insert (user_id, name, prefix, key_hash) on public.api_keys to authenticated;
grant update (revoked_at) on public.api_keys to authenticated;

revoke all on public.api_requests from anon, authenticated;
revoke all on public.api_usage_periods from anon, authenticated;

-- At most five active keys per account. The advisory lock serialises two
-- concurrent inserts by the same user so both cannot pass the count.
create or replace function public.api_keys_enforce_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  active integer;
begin
  perform pg_advisory_xact_lock(hashtext(new.user_id::text));
  select count(*) into active
    from public.api_keys
   where user_id = new.user_id and revoked_at is null;
  if active >= 5 then
    raise exception 'api_key_limit' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists api_keys_enforce_limit on public.api_keys;
create trigger api_keys_enforce_limit
  before insert on public.api_keys
  for each row execute function public.api_keys_enforce_limit();

revoke all on function public.api_keys_enforce_limit() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Bridge functions
-- ---------------------------------------------------------------------------

-- Resolves a key hash to its owner. Unknown and revoked keys both return null,
-- so the caller cannot tell them apart and neither can its client.
create or replace function public.api_key_lookup(p_bridge_secret text, p_key_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key public.api_keys;
begin
  if not public.api_secret_matches(p_bridge_secret) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_key from public.api_keys where key_hash = p_key_hash and revoked_at is null;
  if v_key.id is null then
    return null;
  end if;

  -- Hourly resolution is enough to show "last used", and avoids a write per request.
  if v_key.last_used_at is null or v_key.last_used_at < now() - interval '1 hour' then
    update public.api_keys set last_used_at = now() where id = v_key.id;
  end if;

  return jsonb_build_object('keyId', v_key.id, 'userId', v_key.user_id);
end;
$$;

-- Claims one request against the monthly allowance.
--
-- Order matters:
--   1. Insert the ledger row. The unique constraint decides whether this is a
--      new request or a repeat; a concurrent duplicate blocks here until the
--      first transaction commits.
--   2. For a repeat: a different body is a client bug (MISMATCH); a completed
--      request is replayed; a recent claim is still running (IN_FLIGHT); an
--      old claim was abandoned by a crashed caller and is taken over without
--      being counted again.
--   3. For a new request: increment the month, but only while it is under the
--      allowance. The conditional upsert is one statement, so two requests
--      cannot both take the last unit.
create or replace function public.api_request_claim(
  p_bridge_secret text,
  p_key_id uuid,
  p_idempotency_key text,
  p_request_hash text,
  p_included integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_id uuid;
  v_row public.api_requests;
  v_period date := date_trunc('month', timezone('utc', now()))::date;
  v_used integer;
begin
  if not public.api_secret_matches(p_bridge_secret) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select user_id into v_user from public.api_keys where id = p_key_id and revoked_at is null;
  if v_user is null then
    return jsonb_build_object('status', 'UNKNOWN_KEY');
  end if;

  insert into public.api_requests (key_id, user_id, idempotency_key, request_hash)
  values (p_key_id, v_user, p_idempotency_key, p_request_hash)
  on conflict (key_id, idempotency_key) do nothing
  returning id into v_id;

  if v_id is null then
    select * into v_row
      from public.api_requests
     where key_id = p_key_id and idempotency_key = p_idempotency_key
       for update;

    if v_row.request_hash <> p_request_hash then
      return jsonb_build_object('status', 'MISMATCH');
    end if;
    if v_row.status = 'completed' then
      return jsonb_build_object('status', 'REPLAY', 'response', v_row.response);
    end if;
    if v_row.created_at > now() - interval '2 minutes' then
      return jsonb_build_object('status', 'IN_FLIGHT');
    end if;

    update public.api_requests set created_at = now() where id = v_row.id;
    select requests_used into v_used
      from public.api_usage_periods
     where user_id = v_user and period_start = v_period;
    return jsonb_build_object('status', 'CLAIMED', 'requestId', v_row.id, 'used', coalesce(v_used, 0));
  end if;

  if p_included >= 1 then
    insert into public.api_usage_periods as u (user_id, period_start, requests_used)
    values (v_user, v_period, 1)
    on conflict (user_id, period_start) do update
      set requests_used = u.requests_used + 1
      where u.requests_used < p_included
    returning u.requests_used into v_used;
  end if;

  if v_used is null then
    delete from public.api_requests where id = v_id;
    return jsonb_build_object('status', 'QUOTA_EXHAUSTED', 'used', greatest(p_included, 0));
  end if;

  return jsonb_build_object('status', 'CLAIMED', 'requestId', v_id, 'used', v_used);
end;
$$;

create or replace function public.api_request_complete(
  p_bridge_secret text,
  p_request_id uuid,
  p_mode text,
  p_response jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.api_secret_matches(p_bridge_secret) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.api_requests
     set status = 'completed', mode = p_mode, response = p_response, completed_at = now()
   where id = p_request_id and status = 'claimed';
end;
$$;

-- Gives the unit back when the request failed after it was claimed. A
-- completed request is never released.
create or replace function public.api_request_release(p_bridge_secret text, p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_created timestamptz;
begin
  if not public.api_secret_matches(p_bridge_secret) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  delete from public.api_requests
   where id = p_request_id and status = 'claimed'
  returning user_id, created_at into v_user, v_created;

  if v_user is null then
    return;
  end if;

  update public.api_usage_periods
     set requests_used = greatest(requests_used - 1, 0)
   where user_id = v_user
     and period_start = date_trunc('month', timezone('utc', v_created))::date;
end;
$$;

create or replace function public.api_usage(p_bridge_secret text, p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_used integer;
begin
  if not public.api_secret_matches(p_bridge_secret) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select requests_used into v_used
    from public.api_usage_periods
   where user_id = p_user_id
     and period_start = date_trunc('month', timezone('utc', now()))::date;
  return coalesce(v_used, 0);
end;
$$;

-- Housekeeping, for the owner to schedule (pg_cron) or run by hand. Completed
-- requests are kept 24 hours for replay; abandoned claims are dropped after a day.
create or replace function public.api_requests_prune()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  delete from public.api_requests
   where (status = 'completed' and completed_at < now() - interval '24 hours')
      or (status = 'claimed' and created_at < now() - interval '24 hours');
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.api_key_lookup(text, text) from public;
revoke all on function public.api_request_claim(text, uuid, text, text, integer) from public;
revoke all on function public.api_request_complete(text, uuid, text, jsonb) from public;
revoke all on function public.api_request_release(text, uuid) from public;
revoke all on function public.api_usage(text, uuid) from public;
revoke all on function public.api_requests_prune() from public, anon, authenticated;

grant execute on function public.api_key_lookup(text, text) to anon, authenticated;
grant execute on function public.api_request_claim(text, uuid, text, text, integer) to anon, authenticated;
grant execute on function public.api_request_complete(text, uuid, text, jsonb) to anon, authenticated;
grant execute on function public.api_request_release(text, uuid) to anon, authenticated;
grant execute on function public.api_usage(text, uuid) to anon, authenticated;
