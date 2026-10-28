begin;

create table if not exists public.editor_memberships (
  user_id uuid primary key references auth.users (id) on delete cascade,
  inserted_at timestamptz not null default now()
);

alter table public.editor_memberships enable row level security;
revoke all on public.editor_memberships from public, anon, authenticated;
grant select on public.editor_memberships to authenticated;
grant all on public.editor_memberships to service_role;

drop policy if exists "Editors can read their own membership" on public.editor_memberships;
create policy "Editors can read their own membership"
  on public.editor_memberships for select
  to authenticated
  using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-images',
  'blog-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public buckets serve objects by URL; avoid a SELECT policy that can expose listings.
drop policy if exists "Blog images are publicly readable" on storage.objects;

drop policy if exists "Editors can upload blog images" on storage.objects;
create policy "Editors can upload blog images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'blog-images'
    and exists (
      select 1 from public.editor_memberships em
      where em.user_id = (select auth.uid())
    )
  );

drop policy if exists "Editors can replace blog images" on storage.objects;
create policy "Editors can replace blog images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'blog-images'
    and exists (
      select 1 from public.editor_memberships em
      where em.user_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'blog-images'
    and exists (
      select 1 from public.editor_memberships em
      where em.user_id = (select auth.uid())
    )
  );

drop policy if exists "Editors can delete blog images" on storage.objects;
create policy "Editors can delete blog images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'blog-images'
    and exists (
      select 1 from public.editor_memberships em
      where em.user_id = (select auth.uid())
    )
  );

commit;