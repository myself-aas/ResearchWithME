begin;

-- ---------------------------------------------------------------------------
-- Legacy interaction bridge (Task 3): durable, isolated storage for the
-- demo's likes/comments that previously lived in data/articles.json and
-- data/comments.json. Later tasks (4+) bridge the Next.js and Pages readers
-- to these tables/RPCs; nothing here touches the CMS posts/comments tables.
--
-- Seeded verbatim from the checked-in JSON so displayed counts never change
-- (e.g. post-1 starts at 28 comments even though only two seed rows exist).
-- Re-seeding is idempotent (on conflict do nothing) and never overwrites
-- incremented counters or denormalised comments_count.
-- ---------------------------------------------------------------------------

create table if not exists public.legacy_articles (
  id text primary key,
  likes bigint not null default 0,
  comments_count bigint not null default 0,

  constraint legacy_articles_id_format check (id ~ '^post-[0-9]+$'),
  constraint legacy_articles_likes_non_negative check (likes >= 0),
  constraint legacy_articles_comments_count_non_negative check (comments_count >= 0)
);

create table if not exists public.legacy_comments (
  id text primary key,
  post_id text not null references public.legacy_articles (id) on delete cascade,
  author_name text not null,
  author_role text not null default '',
  avatar text not null default '',
  timestamp text not null default 'Just now',
  text text not null,
  inserted_at timestamptz not null default timezone('utc', now()),

  constraint legacy_comments_author_name_length check (char_length(author_name) between 1 and 120),
  constraint legacy_comments_author_role_length check (char_length(author_role) <= 80),
  constraint legacy_comments_avatar_length check (char_length(avatar) <= 16),
  constraint legacy_comments_timestamp_length check (char_length(timestamp) <= 64),
  constraint legacy_comments_text_length check (char_length(text) between 2 and 4000)
);

create index if not exists legacy_comments_post_id_inserted_at_idx
  on public.legacy_comments (post_id, inserted_at);

-- ---------------------------------------------------------------------------
-- 2. Seeds (verbatim from data/articles.json and data/comments.json)
-- ---------------------------------------------------------------------------

insert into public.legacy_articles (id, likes, comments_count) values
  ('post-1', 342, 28),
  ('post-2', 519, 46),
  ('post-3', 284, 31),
  ('post-4', 412, 39),
  ('post-5', 673, 84),
  ('post-6', 488, 52),
  ('post-7', 310, 19),
  ('post-8', 580, 63)
  on conflict (id) do nothing;

insert into public.legacy_comments (id, post_id, author_name, author_role, avatar, timestamp, text) values
  ('comm-1', 'post-1', 'David K., Systems Eng', 'Platform Team', 'DK', '2 days ago', 'Brilliant breakdown. The section explaining how contiguous KV cache allocation blocked concurrent requests was eye-opening. We observed the exact same memory exhaustion pattern on our internal vLLM cluster.'),
  ('comm-2', 'post-1', 'Prof. Li Wei', 'Academic Researcher', 'LW', '1 day ago', 'Great synthesis of the empirical trade-offs. Would love to see a follow-up benchmarking chunked prefill vs speculative decoding under varying context windows.'),
  ('comm-3', 'post-2', 'Aria Sterling', 'ML Alignment Researcher', 'AS', '3 days ago', 'The finding that chain-of-thought length expands purely from reinforcement learning rewards without human demonstrations is one of the most consequential shifts of the year.'),
  ('comm-4', 'post-3', 'Dr. Robert Mendez', 'Cardiologist', 'RM', '4 days ago', 'The anti-inflammatory endothelial protection observed within 8 weeks prior to significant weight reduction aligns perfectly with clinical biomarkers we track in post-infarction cohorts.'),
  ('comm-5', 'post-5', 'Tariq Hassan', 'DevOps Lead', 'TH', '5 days ago', 'Can corroborate this 100%. Migrated from 3 EKS clusters to Nomad on bare metal Hetzner nodes last year. Reduced monthly cloud bill by 78% and haven’t had a single CNI outage.')
  on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Row Level Security: public reads, no direct public writes
-- ---------------------------------------------------------------------------

alter table public.legacy_articles enable row level security;
alter table public.legacy_comments enable row level security;

drop policy if exists "Legacy articles are publicly readable" on public.legacy_articles;
create policy "Legacy articles are publicly readable"
  on public.legacy_articles for select
  using (true);

drop policy if exists "Legacy comments are publicly readable" on public.legacy_comments;
create policy "Legacy comments are publicly readable"
  on public.legacy_comments for select
  using (true);

-- ---------------------------------------------------------------------------
-- 4. RPCs (the only write path): fixed search_path, SECURITY DEFINER
-- ---------------------------------------------------------------------------

create or replace function public.increment_legacy_like(target_id text)
returns bigint
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  new_likes bigint;
begin
  update public.legacy_articles
     set likes = likes + 1
   where id = target_id
  returning likes into new_likes;

  if new_likes is null then
    raise exception 'unknown legacy article id: %', target_id using errcode = '22023';
  end if;

  return new_likes;
end;
$$;

create or replace function public.add_legacy_comment(target_id text, author_name text, author_role text, content text)
returns public.legacy_comments
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  inserted public.legacy_comments;
begin
  if target_id is null or not exists (select 1 from public.legacy_articles where id = target_id) then
    raise exception 'unknown legacy article id: %', coalesce(target_id, '<null>') using errcode = '22023';
  end if;

  if author_name is null or char_length(btrim(author_name)) < 1 or char_length(author_name) > 120 then
    raise exception 'author_name must be between 1 and 120 characters' using errcode = '22023';
  end if;

  if author_role is not null and char_length(author_role) > 80 then
    raise exception 'author_role must be at most 80 characters' using errcode = '22023';
  end if;

  if content is null or char_length(btrim(content)) < 2 or char_length(content) > 4000 then
    raise exception 'content must be between 2 and 4000 characters' using errcode = '22023';
  end if;

  insert into public.legacy_comments (id, post_id, author_name, author_role, avatar, timestamp, text)
  values (
    'comm-' || substr(md5(random()::text || clock_timestamp()::text), 1, 16),
    target_id,
    btrim(author_name),
    coalesce(author_role, ''),
    upper(left(split_part(btrim(author_name), ' ', 1), 1))
      || upper(left(split_part(btrim(author_name), ' ', 2), 1)),
    'Just now',
    btrim(content)
  )
  returning * into inserted;

  update public.legacy_articles
     set comments_count = comments_count + 1
   where id = target_id;

  return inserted;
end;
$$;

revoke all on function public.increment_legacy_like(text) from public;
revoke all on function public.add_legacy_comment(text, text, text, text) from public;
grant execute on function public.increment_legacy_like(text) to anon, authenticated;
grant execute on function public.add_legacy_comment(text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Role privileges: read-only tables, no direct writes
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;
revoke all on public.legacy_articles from public;
revoke all on public.legacy_comments from public;
grant select on public.legacy_articles to anon, authenticated;
grant select on public.legacy_comments to anon, authenticated;

commit;
