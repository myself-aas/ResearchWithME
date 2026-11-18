-- Profile social counters, backed by real rows.
--
-- The profile header shows followers, saves received, and published reviews.
-- Those numbers already have a home in the schema:
--
--   * public.v34_user_follows(follower_id, followee_id)   -- wave 9 follow graph
--   * public.v34_library_items(user_id, item_type, item_id) -- personal library
--   * public.v34_contributions(author_id, lifecycle)      -- scholarly reviews
--
-- Reading them directly from the browser does not work: v34_library_items is
-- owner-only by design, so an author cannot count who saved their work, and
-- three separate queries would still need a join to attribute a save to an
-- author. This migration adds exactly one aggregate entry point.
--
-- Privacy: the function is SECURITY DEFINER because it must see rows the caller
-- cannot, but it returns three integers and nothing else -- no follower
-- identities, no collection names, no titles. It is executable by authenticated
-- users only, since the dashboard header is its consumer.
--
-- Definition of "saves received": distinct libraries that saved one of the
-- caller's contributions. Saves of sources/tools/articles are not attributed to
-- a profile because those objects do not carry a profile author id, and
-- inventing an attribution would be worse than omitting the number.
--
-- Idempotent: safe to re-run.

begin;

-- Follower lookups filter by followee; the primary key covers follower-first
-- only. Library counts join saved item ids back to contributions.
create index if not exists v34_user_follows_followee_idx
  on public.v34_user_follows (followee_id, created_at desc);

create index if not exists v34_library_items_item_idx
  on public.v34_library_items (item_type, item_id);

create or replace function public.v34_profile_social_counts(p_user_id uuid)
returns table (
  followers integer,
  saves_received integer,
  published_reviews integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    (
      select count(*)::integer
      from public.v34_user_follows f
      where f.followee_id = p_user_id
    ) as followers,
    (
      select count(*)::integer
      from public.v34_library_items li
      join public.v34_contributions c
        on li.item_type = 'contribution'
       and li.item_id = c.id
      where c.author_id = p_user_id
    ) as saves_received,
    (
      select count(*)::integer
      from public.v34_contributions c
      where c.author_id = p_user_id
        and c.lifecycle = 'published'
    ) as published_reviews;
$$;

comment on function public.v34_profile_social_counts(uuid) is
  'Aggregate profile counters: followers, saves of the author''s contributions, and published reviews. Returns counts only.';

revoke all on function public.v34_profile_social_counts(uuid) from public;
revoke all on function public.v34_profile_social_counts(uuid) from anon;
grant execute on function public.v34_profile_social_counts(uuid) to authenticated;

commit;
