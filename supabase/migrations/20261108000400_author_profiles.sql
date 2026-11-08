-- Author profiles.
--
-- Until now the author directory was a hardcoded `AUTHORS` record in
-- lib/blog-data.ts: six invented people, bundled into the client at build time.
-- There was no table to write to, so an author could not edit their own profile
-- and no editor could correct one. This table replaces that record.
--
-- One row per auth.users account. A profile exists as soon as its owner creates
-- it, but it only appears in the public directory once `published` is true, so a
-- half-filled profile never surfaces on /authors.
--
-- Ownership is enforced in the policies rather than in a security-definer
-- function: the invariant here is simply "you may write your own row", which a
-- policy expresses directly. Applications use functions instead because they
-- guard a state machine; profiles do not.
--
-- Idempotent: safe to re-run.

begin;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,

  -- Public directory identity. `slug` is the /author/[slug] path segment.
  slug text not null check (char_length(btrim(slug)) between 2 and 80),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 120),

  bio text not null default '' check (char_length(bio) <= 2000),
  role text not null default '' check (char_length(role) <= 120),
  domain text not null default '' check (char_length(domain) <= 160),
  institution text not null default '' check (char_length(institution) <= 200),
  avatar_url text not null default '' check (char_length(avatar_url) <= 500),

  -- Scholarly identifiers. These are self-declared here; the verified ones come
  -- from a linked identity in auth.users.identities, which is the record the
  -- writer application actually checks.
  orcid text not null default '' check (char_length(orcid) <= 40),
  github text not null default '' check (char_length(github) <= 80),
  website text not null default '' check (char_length(website) <= 500),
  scholar text not null default '' check (char_length(scholar) <= 500),

  -- Directory visibility. Owners may publish their own profile; an editor can
  -- unpublish any profile without deleting it.
  published boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.profiles_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.normalize_profile_slug()
returns trigger
language plpgsql
as $$
begin
  new.slug := lower(btrim(new.slug));
  if new.slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'invalid_slug';
  end if;
  return new;
end;
$$;

-- Lowercase, URL-safe slugs only, so the directory path cannot contain
-- characters that need escaping.
drop trigger if exists profiles_normalize_slug on public.profiles;
create trigger profiles_normalize_slug
  before insert or update of slug on public.profiles
  for each row execute function public.normalize_profile_slug();

-- updated_at is maintained by the database so a client cannot backdate it.
drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.profiles_set_updated_at();

alter table public.profiles enable row level security;

-- Public directory: anyone may read a published profile, including anon,
-- because /authors is a public page.
drop policy if exists "Anyone can read a published profile" on public.profiles;
create policy "Anyone can read a published profile"
  on public.profiles for select
  to anon, authenticated
  using (published or user_id = (select auth.uid()) or (select public.is_editor()));

-- Owners create their own row and nobody else's.
drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
  on public.profiles for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- Owners edit their own profile; editors may edit any, so a typo in someone's
-- byline does not have to wait on the author.
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_editor()))
  with check (user_id = (select auth.uid()) or (select public.is_editor()));

drop policy if exists "Users can delete their own profile" on public.profiles;
create policy "Users can delete their own profile"
  on public.profiles for delete
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_editor()));

-- A slug is a URL, so it must be unique across the directory.
create unique index if not exists profiles_slug_key on public.profiles (slug);

-- The directory lists published profiles, usually newest first.
create index if not exists profiles_published_created_at_idx
  on public.profiles (published, created_at desc);

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant insert, update, delete on public.profiles to authenticated;

commit;
