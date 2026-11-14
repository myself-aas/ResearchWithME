-- Writer applications cite an identity the database has seen, not one the
-- browser typed.
--
-- Until now `apply_as_author()` stored whatever provider and handle the caller
-- sent. The form only offered linked accounts, but the RPC is callable by any
-- signed-in user, so an application could name an ORCID iD or a GitHub account
-- that was never connected, and the reviewing editor had no way to tell.
--
-- This replaces the function (same signature, same grants) so that it:
--
--   1. requires a row in auth.identities for the caller and the named provider.
--      ORCID is a custom OIDC provider, which Supabase records as
--      `custom:orcid`; both spellings are accepted.
--   2. takes the handle from that row. `p_handle` is kept so existing callers
--      keep working, and is ignored.
--
-- New error codes: `identity_not_linked` (nothing connected for that provider)
-- and the existing `handle_required` (connected, but the provider returned no
-- usable identifier).
--
-- Rows already in public.author_applications are not rewritten: they were
-- submitted under the old rule and an editor should re-check any that are
-- still pending.
--
-- Idempotent: safe to re-run.

begin;

create or replace function public.apply_as_author(
  p_provider text,
  p_handle text,
  p_display_name text,
  p_statement text default ''
)
returns public.author_applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  orcid_shape constant text := '[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9Xx]';
  is_linked boolean := false;
  linked_handle text;
  result public.author_applications;
begin
  if caller is null then
    raise exception 'not_authenticated';
  end if;
  if p_provider is null or p_provider not in ('github', 'orcid') then
    raise exception 'unsupported_provider';
  end if;
  if char_length(btrim(coalesce(p_display_name, ''))) = 0 then
    raise exception 'name_required';
  end if;
  if exists (select 1 from public.editors e where e.user_id = caller) then
    raise exception 'already_editor';
  end if;

  -- The identity as the provider returned it. For ORCID the iD is the OIDC
  -- subject, sometimes as a full https://orcid.org/ URL, so it is matched by
  -- shape. For GitHub the username is `user_name` (or `preferred_username`);
  -- the numeric subject is deliberately not a fallback, because an editor
  -- cannot check a number against a profile.
  select
    true,
    case
      when p_provider = 'orcid' then upper(coalesce(
        substring(i.identity_data ->> 'sub' from orcid_shape),
        substring(i.provider_id from orcid_shape),
        substring(i.identity_data ->> 'provider_id' from orcid_shape),
        substring(i.identity_data ->> 'preferred_username' from orcid_shape)
      ))
      else coalesce(
        nullif(btrim(i.identity_data ->> 'user_name'), ''),
        nullif(btrim(i.identity_data ->> 'preferred_username'), '')
      )
    end
  into is_linked, linked_handle
  from auth.identities i
  where i.user_id = caller
    and i.provider in (p_provider, 'custom:' || p_provider)
  order by i.created_at
  limit 1;

  if not coalesce(is_linked, false) then
    raise exception 'identity_not_linked';
  end if;
  if char_length(coalesce(linked_handle, '')) = 0 then
    raise exception 'handle_required';
  end if;

  insert into public.author_applications (
    user_id, provider, handle, display_name, statement
  )
  values (
    caller,
    p_provider,
    left(linked_handle, 160),
    left(btrim(p_display_name), 120),
    left(coalesce(p_statement, ''), 1000)
  )
  on conflict (user_id, provider) do update set
    handle = excluded.handle,
    display_name = excluded.display_name,
    statement = excluded.statement,
    -- A rejected applicant may reapply; an approved or pending one keeps its state.
    status = case
      when public.author_applications.status = 'rejected' then 'pending'
      else public.author_applications.status
    end,
    reviewed_by = null,
    reviewed_at = null,
    review_note = '',
    updated_at = now()
  returning * into result;

  return result;
end;
$$;

revoke all on function public.apply_as_author(text, text, text, text) from public, anon;
grant execute on function public.apply_as_author(text, text, text, text) to authenticated;

commit;
