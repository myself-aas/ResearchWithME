/**
 * Local verification of
 * supabase/migrations/20261114000100_verify_application_identity.sql.
 *
 * pgTAP (author_applications.test.sql) is the primary suite and needs Docker.
 * This is the fallback, in the same shape as billing-bridge.check.mjs: the real
 * migrations applied to an embedded Postgres (PGlite) behind a small shim for
 * the Supabase surface they touch.
 *
 * Run:  PGLITE_PATH=/path/to/@electric-sql/pglite/dist/index.js \
 *         node supabase/tests/application-identity.check.mjs
 * Not part of `npm run quality`; PGlite is installed outside the repository.
 */
const { PGlite } = await import(process.env.PGLITE_PATH ?? '@electric-sql/pglite');
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const migration = (name) => readFileSync(fileURLToPath(new URL(`../migrations/${name}`, import.meta.url)), 'utf8');

const db = new PGlite();
await db.exec(`
create schema if not exists auth;
create table auth.users (id uuid primary key);
create table auth.identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  provider_id text not null,
  identity_data jsonb not null,
  created_at timestamptz default now()
);
create role anon; create role authenticated;
grant usage on schema public to anon, authenticated;
create or replace function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
create table public.editors (user_id uuid primary key, note text);
create or replace function public.is_editor() returns boolean language sql stable security definer set search_path = '' as
  $$ select exists (select 1 from public.editors e where e.user_id = (select auth.uid())) $$;
`);
await db.exec(migration('20261108000300_author_applications.sql'));
await db.exec(migration('20261114000100_verify_application_identity.sql'));

const A = '10000000-0000-4000-8000-0000000000a1';
const B = '10000000-0000-4000-8000-0000000000b2';
const C = '10000000-0000-4000-8000-0000000000c3';
const EDITOR = '10000000-0000-4000-8000-0000000000e5';
for (const id of [A, B, C, EDITOR]) await db.query(`insert into auth.users (id) values ($1)`, [id]);
await db.query(`insert into public.editors (user_id, note) values ($1, 'seed')`, [EDITOR]);

const link = (user, provider, providerId, data) =>
  db.query(`insert into auth.identities (user_id, provider, provider_id, identity_data) values ($1, $2, $3, $4)`, [
    user, provider, providerId, JSON.stringify(data),
  ]);

let fails = 0;
const check = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log(`${pass ? 'ok  ' : 'FAIL'} ${label}${pass ? '' : `\n       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`}`);
};

/** Calls the RPC as `user` under the authenticated role; returns the row or the error code. */
async function apply(user, provider, handle, name = 'Applicant') {
  await db.exec(`set role authenticated; set test.uid = '${user ?? ''}';`);
  try {
    const { rows } = await db.query(`select * from public.apply_as_author($1, $2, $3, '')`, [provider, handle, name]);
    return rows[0];
  } catch (error) {
    return String(error.message);
  } finally {
    await db.exec(`reset role; reset test.uid;`);
  }
}

check('no session is refused', await apply(null, 'orcid', '0000-0002-1825-0097'), 'not_authenticated');
check('an ORCID iD that was never connected is refused', await apply(A, 'orcid', '0000-0002-1825-0097'), 'identity_not_linked');
check('a GitHub name that was never connected is refused', await apply(A, 'github', 'torvalds'), 'identity_not_linked');

await link(A, 'custom:orcid', 'https://orcid.org/0000-0002-1694-233x', {
  sub: 'https://orcid.org/0000-0002-1694-233x',
  name: 'Applicant',
});
const orcid = await apply(A, 'orcid', '0000-0002-1825-0097');
check('custom:orcid counts as ORCID, and the stored iD is the linked one', [orcid.provider, orcid.handle, orcid.status], [
  'orcid', '0000-0002-1694-233X', 'pending',
]);
check('linking ORCID does not vouch for GitHub', await apply(A, 'github', 'torvalds'), 'identity_not_linked');

await link(B, 'github', '583231', { sub: '583231', user_name: 'octocat' });
check('the stored GitHub username is the linked one', (await apply(B, 'github', 'torvalds')).handle, 'octocat');
check("another account's identity is not borrowed", await apply(C, 'github', 'octocat'), 'identity_not_linked');

await link(C, 'github', '999', { sub: '999' });
check('a linked identity with no usable identifier is refused', await apply(C, 'github', 'anything'), 'handle_required');
await link(C, 'orcid', '0000-0001-5109-3700', { name: 'No Subject' });
check('the ORCID iD is found in provider_id when the subject is absent', (await apply(C, 'orcid', '')).handle, '0000-0001-5109-3700');

check('unsupported providers are still refused', await apply(A, 'gitlab', 'x'), 'unsupported_provider');
check('an empty name is still refused', await apply(B, 'github', 'octocat', '   '), 'name_required');
await link(EDITOR, 'github', '1', { user_name: 'ed' });
check('an editor is still refused', await apply(EDITOR, 'github', 'ed'), 'already_editor');

await db.exec(`set role anon;`);
let anon = 'allowed';
try { await db.query(`select public.apply_as_author('github', 'x', 'y', '')`); } catch (error) { anon = /permission denied/.test(error.message) ? 'denied' : error.message; }
await db.exec(`reset role;`);
check('anon still cannot execute the function', anon, 'denied');

console.log(fails ? `\n${fails} check(s) failed` : '\nAll checks passed');
process.exit(fails ? 1 : 0);
