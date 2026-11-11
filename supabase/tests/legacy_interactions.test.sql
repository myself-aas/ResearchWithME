-- pgTAP coverage for the legacy interaction bridge (Task 3).
-- Runs against the LOCAL Supabase database only:
--   npx supabase db reset --local && npx supabase test db --local
-- Never against a hosted project.
begin;
select plan(19);

-- ---------------------------------------------------------------------------
-- Seeded state (verbatim from data/articles.json / data/comments.json)
-- ---------------------------------------------------------------------------
select is((select likes from public.legacy_articles where id = 'post-1'), 342::bigint,
  'post-1 seed likes');
select is((select comments_count from public.legacy_articles where id = 'post-1'), 28::bigint,
  'displayed seed comment count is preserved (not the seed row count)');
select is((select count(*) from public.legacy_articles), 8::bigint,
  'exactly eight seeded articles');
select is((select count(*) from public.legacy_comments where post_id = 'post-1'), 2::bigint,
  'two seed comment rows for post-1');
select is((select relrowsecurity from pg_class where relname = 'legacy_articles' and relnamespace = 'public'::regnamespace), true,
  'RLS enabled on legacy_articles');
select is((select relrowsecurity from pg_class where relname = 'legacy_comments' and relnamespace = 'public'::regnamespace), true,
  'RLS enabled on legacy_comments');

-- ---------------------------------------------------------------------------
-- Anonymous writers are rejected at the privilege layer (42501)
-- ---------------------------------------------------------------------------
set local role anon;
select throws_ok($$update public.legacy_articles set likes = 999 where id = 'post-1'$$,
  '42501', null, 'anon cannot set a counter');
select throws_ok($$insert into public.legacy_articles (id, likes, comments_count) values ('post-99', 1, 1)$$,
  '42501', null, 'anon cannot insert an article row');
select throws_ok($$insert into public.legacy_comments (id, post_id, author_name, author_role, avatar, timestamp, text) values ('comm-anon', 'post-1', 'Anon', '', 'AN', 'now', 'should not land')$$,
  '42501', null, 'anon cannot insert a comment directly');
select throws_ok($$delete from public.legacy_comments where id = 'comm-1'$$,
  '42501', null, 'anon cannot delete a seeded comment directly');
reset role;

-- ---------------------------------------------------------------------------
-- RPCs: the only write path
-- ---------------------------------------------------------------------------
select is(public.increment_legacy_like('post-1'), 343::bigint,
  'increment_legacy_like returns the new counter');
select throws_ok($$select public.increment_legacy_like('post-unknown')$$,
  '22023', null, 'increment_legacy_like rejects unknown article ids');
select throws_ok($$select public.add_legacy_comment('post-unknown', 'Reader', '', 'a perfectly valid body')$$,
  '22023', null, 'add_legacy_comment rejects unknown article ids');
select throws_ok($$select public.add_legacy_comment('post-1', '', '', 'a perfectly valid body')$$,
  '22023', null, 'add_legacy_comment rejects empty author names');
select throws_ok($$select public.add_legacy_comment('post-1', 'Reader', '', 'x')$$,
  '22023', null, 'add_legacy_comment rejects too-short comment bodies');
select throws_ok($$select public.add_legacy_comment('post-1', 'Reader', '', repeat('x', 4001))$$,
  '22023', null, 'add_legacy_comment rejects overlong comment bodies');
select is((public.add_legacy_comment('post-1', 'Reader', 'Tester', 'An honest integration test comment.')).author_name,
  'Reader', 'add_legacy_comment returns the inserted comment');
select is((select comments_count from public.legacy_articles where id = 'post-1'), 29::bigint,
  'add_legacy_comment increments the displayed count atomically');
select is((select count(*) from public.legacy_comments where post_id = 'post-1' and author_name = 'Reader'), 1::bigint,
  'the new comment is retrievable');

select * from finish();
rollback;
