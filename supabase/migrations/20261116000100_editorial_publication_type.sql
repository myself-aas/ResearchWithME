-- Editorial publication type & Editor-in-Chief role.
--
-- Adds a role column to public.editors (defaulting to 'editor') so approved
-- contributors remain regular editors while the Editor-in-Chief accounts can
-- classify a post as either a 'review' (default) or an 'editorial'.
--
-- Access to 'editorial' classification is enforced at both the API layer and
-- the database layer (via public.is_editor_in_chief() and a BEFORE INSERT OR
-- UPDATE trigger on public.posts).

alter table public.editors
  add column if not exists role text not null default 'editor';

alter table public.editors
  drop constraint if exists editors_role_allowed;

alter table public.editors
  add constraint editors_role_allowed
  check (role in ('editor', 'editor-in-chief'));

-- Promote Editor-in-Chief Ashif Ahmed Shuvo's allowlisted accounts.
update public.editors e
set role = 'editor-in-chief'
from auth.users u
where e.user_id = u.id
  and lower(u.email) in (
    'shuvo.1807016@bau.edu.bd',
    'asifahmedshuvo.aas@gmail.com',
    'ashif@researchwith.me',
    'hello@researchwith.me'
  );

-- Returns true iff the signed-in caller is an allowlisted Editor-in-Chief.
-- Mirrors public.is_editor(): SECURITY DEFINER + locked search_path so callers
-- cannot spoof or enumerate public.editors.
create or replace function public.is_editor_in_chief()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.editors e
    where e.user_id = (select auth.uid())
      and e.role = 'editor-in-chief'
  );
$$;

revoke all on function public.is_editor_in_chief() from public;
grant execute on function public.is_editor_in_chief() to anon, authenticated;

-- Dedicated publication_type on public.posts ('review' | 'editorial'), leaving
-- category and format columns untouched.
alter table public.posts
  add column if not exists publication_type text not null default 'review';

alter table public.posts
  drop constraint if exists posts_publication_type_allowed;

alter table public.posts
  add constraint posts_publication_type_allowed
  check (publication_type in ('review', 'editorial'));

-- Enforce at the database layer that only the Editor-in-Chief can insert an
-- editorial or reclassify an existing post's publication_type. Service-role /
-- SQL-editor sessions (where auth.uid() is null) are not blocked.
create or replace function public.enforce_editorial_publication_type()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' and new.publication_type = 'editorial' then
      if not public.is_editor_in_chief() then
        raise exception 'Only the Editor-in-Chief can publish an Editorial.'
          using errcode = '42501';
      end if;
    elsif tg_op = 'UPDATE' and new.publication_type is distinct from old.publication_type then
      if not public.is_editor_in_chief() then
        raise exception 'Only the Editor-in-Chief can change a post between Review and Editorial.'
          using errcode = '42501';
      end if;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_editorial_publication_type() from public;

drop trigger if exists posts_enforce_editorial_publication_type on public.posts;
create trigger posts_enforce_editorial_publication_type
  before insert or update on public.posts
  for each row
  execute function public.enforce_editorial_publication_type();
