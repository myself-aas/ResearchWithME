-- Editor allowlist for the editorial studio.
--
-- Until now every `authenticated` user was treated as an editor. That held
-- while administrators created every account by hand, but with Google, GitHub,
-- and email sign-in enabled anyone can create an account. Writes to posts,
-- comment moderation, and image uploads now require a row in public.editors.
--
-- Signing in still works for everyone; it simply grants no studio access.
--
-- Grant access (SQL editor, run as the project owner):
--   insert into public.editors (user_id, note)
--   select id, 'founding editor' from auth.users where email = 'you@example.org'
--   on conflict (user_id) do nothing;
--
-- Revoke access:
--   delete from public.editors where user_id = '<uuid>';
--
-- Idempotent: safe to re-run.

begin;

create table if not exists public.editors (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text check (note is null or char_length(note) <= 200),
  added_at timestamptz not null default now()
);

alter table public.editors enable row level security;

-- A signed-in user may see their own row (and nothing else). There are no
-- insert, update, or delete policies: membership is managed with SQL or the
-- service role only, never from the browser.
drop policy if exists "Users can see their own editor row" on public.editors;
create policy "Users can see their own editor row"
  on public.editors for select
  to authenticated
  using (user_id = auth.uid());

revoke all on public.editors from anon, authenticated;
grant select on public.editors to authenticated;

-- SECURITY DEFINER so policies on other tables can consult the allowlist
-- without granting broader read access to it.
create or replace function public.is_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.editors e where e.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_editor() from public;
grant execute on function public.is_editor() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Posts
-- ---------------------------------------------------------------------------
drop policy if exists "Editors can read every post" on public.posts;
create policy "Editors can read every post"
  on public.posts for select
  to authenticated
  using ((select public.is_editor()));

drop policy if exists "Editors can create posts" on public.posts;
create policy "Editors can create posts"
  on public.posts for insert
  to authenticated
  with check ((select public.is_editor()));

drop policy if exists "Editors can update posts" on public.posts;
create policy "Editors can update posts"
  on public.posts for update
  to authenticated
  using ((select public.is_editor()))
  with check ((select public.is_editor()));

drop policy if exists "Editors can delete posts" on public.posts;
create policy "Editors can delete posts"
  on public.posts for delete
  to authenticated
  using ((select public.is_editor()));

-- ---------------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------------
-- Signed-in non-editors are readers: they see the same published discussion
-- as anonymous visitors. The original policy only covered `anon`.
drop policy if exists "Published comments are publicly readable" on public.comments;
create policy "Published comments are publicly readable"
  on public.comments for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_id and p.status = 'published'
    )
  );

drop policy if exists "Editors can read all comments" on public.comments;
create policy "Editors can read all comments"
  on public.comments for select
  to authenticated
  using ((select public.is_editor()));

drop policy if exists "Editors can delete comments" on public.comments;
create policy "Editors can delete comments"
  on public.comments for delete
  to authenticated
  using ((select public.is_editor()));

-- ---------------------------------------------------------------------------
-- Storage: blog-images bucket
-- ---------------------------------------------------------------------------
drop policy if exists "Editors can upload blog images" on storage.objects;
create policy "Editors can upload blog images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'blog-images' and (select public.is_editor()));

drop policy if exists "Editors can replace blog images" on storage.objects;
create policy "Editors can replace blog images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'blog-images' and (select public.is_editor()))
  with check (bucket_id = 'blog-images' and (select public.is_editor()));

drop policy if exists "Editors can delete blog images" on storage.objects;
create policy "Editors can delete blog images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'blog-images' and (select public.is_editor()));

commit;
