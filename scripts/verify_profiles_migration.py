"""Verify the author_profiles migration against a real PostgreSQL cluster.

Applies every migration in order, re-applies them all to prove idempotency, then
asserts the RLS behaviour a fresh cluster would actually exhibit.
"""
import pathlib
import shutil
import sys

import pgserver
import psycopg

REPO = pathlib.Path("/home/user/ResearchWithME")
PGDATA = "/tmp/rwm-profiles-pgdata"
MIGRATIONS = sorted((REPO / "supabase/migrations").glob("*.sql"))

STUB = """
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key,
  email text
);
create or replace function auth.uid() returns uuid
language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
$$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

-- Minimal stand-in for Supabase's storage schema. The migrations only touch
-- storage.buckets and storage.objects.bucket_id.
create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key,
  name text,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid,
  metadata jsonb
);
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated, service_role;
"""

OWNER = "11111111-1111-1111-1111-111111111111"
OTHER = "22222222-2222-2222-2222-222222222222"
EDITOR = "33333333-3333-3333-3333-333333333333"

passed = []
failed = []


def check(label, condition, detail=""):
    (passed if condition else failed).append(label)
    print(f"  {'PASS' if condition else 'FAIL'}  {label}{(' — ' + detail) if detail and not condition else ''}")


def main():
    shutil.rmtree(PGDATA, ignore_errors=True)
    server = pgserver.get_server(PGDATA, cleanup_mode=None)
    uri = server.get_uri()

    with psycopg.connect(uri, autocommit=True) as conn:
        conn.execute(STUB)
        print(f"PostgreSQL {conn.execute('show server_version').fetchone()[0]}")
        print(f"applying {len(MIGRATIONS)} migrations")

        for path in MIGRATIONS:
            conn.execute(path.read_text())
        print("  first pass OK")

        # Idempotency: every migration must survive being run twice.
        for path in MIGRATIONS:
            conn.execute(path.read_text())
        print("  re-apply OK (idempotent)")

        conn.execute("insert into auth.users (id, email) values (%s, 'owner@example.org'), (%s, 'other@example.org'), (%s, 'editor@example.org')",
                     (OWNER, OTHER, EDITOR))
        conn.execute("insert into public.editors (user_id, note) values (%s, 'founding editor')", (EDITOR,))

        def as_role(role, uid, sql, params=None, fetch=False):
            """Run SQL as `role` with a JWT subject, in its own transaction."""
            try:
                with conn.transaction():
                    conn.execute("set local role %s" % role)
                    if uid:
                        # SET cannot take a bound parameter; set_config can.
                        conn.execute("select set_config('request.jwt.claims', %s, true)",
                                     ('{"sub":"%s"}' % uid,))
                    cur = conn.execute(sql, params or ())
                    return ("ok", cur.fetchall() if fetch else None)
            except Exception as exc:  # noqa: BLE001
                return ("error", str(exc).strip().splitlines()[0])

        print("\nRLS and constraint assertions:")

        # --- schema shape -------------------------------------------------
        rls = conn.execute("select relrowsecurity from pg_class where oid = 'public.profiles'::regclass").fetchone()[0]
        check("row level security is enabled", rls is True)

        cols = {r[0] for r in conn.execute(
            "select column_name from information_schema.columns where table_schema='public' and table_name='profiles'").fetchall()}
        expected = {"user_id", "slug", "display_name", "bio", "published", "orcid", "github"}
        check("has the expected columns", expected <= cols, "missing: " + str(sorted(expected - cols)))

        # --- owner creates their own profile ------------------------------
        status, err = as_role("authenticated", OWNER,
            "insert into public.profiles (user_id, slug, display_name, bio, published) "
            "values (%s, 'Maya-Lin', 'Maya Lin', 'Reproducibility and open tooling.', true)", (OWNER,))
        check("owner can create their own profile", status == "ok", err)

        # --- slug normalisation ------------------------------------------
        got = conn.execute("select slug from public.profiles where user_id = %s", (OWNER,)).fetchone()
        check("slug is lowercased and trimmed", got is not None and got[0] == "maya-lin", repr(got))

        # --- slug uniqueness ---------------------------------------------
        status, err = as_role("authenticated", OTHER,
            "insert into public.profiles (user_id, slug, display_name) values (%s, 'maya-lin', 'Impostor')", (OTHER,))
        check("duplicate slug is rejected", status == "error" and "profiles_slug_key" in err, err)

        # --- invalid slug -------------------------------------------------
        status, err = as_role("authenticated", OTHER,
            "insert into public.profiles (user_id, slug, display_name) values (%s, 'Not A Slug!', 'Bad Slug')", (OTHER,))
        check("malformed slug is rejected", status == "error" and "invalid_slug" in err, err)

        # --- cannot impersonate ------------------------------------------
        status, err = as_role("authenticated", OTHER,
            "insert into public.profiles (user_id, slug, display_name) values (%s, 'someone-else', 'Nobody')", (OWNER,))
        check("cannot create a profile for another user_id",
              status == "error" and "row-level security" in err, err)

        # --- second, unpublished profile ---------------------------------
        status, err = as_role("authenticated", OTHER,
            "insert into public.profiles (user_id, slug, display_name) values (%s, 'marcus-vance', 'Marcus Vance')", (OTHER,))
        check("second owner can create their own profile", status == "ok", err)

        row = conn.execute("select published from public.profiles where user_id = %s", (OTHER,)).fetchone()
        check("published defaults to false", row is not None and row[0] is False,
              "no row for the second owner")

        # --- anon reads ----------------------------------------------------
        status, rows = as_role("anon", None, "select user_id from public.profiles", fetch=True)
        visible = {str(r[0]) for r in rows} if status == "ok" else set()
        check("anon sees only published profiles", status == "ok" and visible == {OWNER},
              f"status={status} payload={rows!r}")

        # --- owner reads own unpublished -----------------------------------
        status, rows = as_role("authenticated", OTHER, "select user_id from public.profiles", fetch=True)
        visible = {str(r[0]) for r in (rows or [])}
        check("owner sees their own unpublished profile plus published ones",
              visible == {OWNER, OTHER}, f"saw {visible}")

        # --- editor reads all ---------------------------------------------
        status, rows = as_role("authenticated", EDITOR, "select user_id from public.profiles", fetch=True)
        check("editor sees every profile", len(rows or []) == 2, f"saw {len(rows or [])}")

        # The app narrows this on purpose: resolvePublishableAuthor filters
        # published = true even though RLS would let an editor read the row.
        # Attribution to an unpublished profile would credit someone whose
        # /author/[slug] page is not in the directory.
        status, rows = as_role("authenticated", EDITOR,
            "select user_id from public.profiles where published = false", fetch=True)
        visible = {str(r[0]) for r in (rows or [])}
        check("editor can read unpublished profiles, so the app's published filter is a real narrowing",
              visible == {OTHER}, f"saw {visible}")

        # --- editor can edit anyone ---------------------------------------
        status, err = as_role("authenticated", EDITOR,
            "update public.profiles set institution = 'Institute for Digital Public Goods' where user_id = %s", (OWNER,))
        check("editor can update another user's profile", status == "ok", err)

        # --- stranger cannot edit -----------------------------------------
        status, err = as_role("authenticated", OTHER,
            "update public.profiles set display_name = 'Hijacked' where user_id = %s", (OWNER,))
        name = conn.execute("select display_name from public.profiles where user_id = %s", (OWNER,)).fetchone()[0]
        check("a stranger's update touches nothing (row is invisible, not an error)",
              name == "Maya Lin", f"status={status} display_name={name!r}")

        # --- owner can edit own, and updated_at moves ----------------------
        before = conn.execute("select updated_at from public.profiles where user_id = %s", (OWNER,)).fetchone()[0]
        conn.execute("select pg_sleep(0.01)")
        status, err = as_role("authenticated", OWNER,
            "update public.profiles set bio = 'Updated bio.' where user_id = %s", (OWNER,))
        after = conn.execute("select updated_at from public.profiles where user_id = %s", (OWNER,)).fetchone()[0]
        check("owner can update their own profile", status == "ok", err)
        check("updated_at is maintained by the database", after > before, f"{before} -> {after}")

        # --- updated_at cannot be backdated by the client -----------------
        status, _ = as_role("authenticated", OWNER,
            "update public.profiles set updated_at = '2000-01-01' where user_id = %s", (OWNER,))
        after = conn.execute("select updated_at from public.profiles where user_id = %s", (OWNER,)).fetchone()[0]
        check("a client-supplied updated_at is overwritten", after.year > 2000, str(after))

        # --- stranger cannot delete ---------------------------------------
        status, err = as_role("authenticated", OTHER, "delete from public.profiles where user_id = %s", (OWNER,))
        still = conn.execute("select count(*) from public.profiles where user_id = %s", (OWNER,)).fetchone()[0]
        check("a stranger's delete touches nothing (row is invisible, not an error)",
              still == 1, f"status={status} remaining={still}")

        # --- editor can delete --------------------------------------------
        status, err = as_role("authenticated", EDITOR, "delete from public.profiles where user_id = %s", (OTHER,))
        remaining = conn.execute("select count(*) from public.profiles").fetchone()[0]
        check("editor can delete any profile", status == "ok" and remaining == 1, err)

        # --- FK cascade ----------------------------------------------------
        conn.execute("delete from auth.users where id = %s", (OWNER,))
        remaining = conn.execute("select count(*) from public.profiles").fetchone()[0]
        check("profile is removed when the auth user is deleted", remaining == 0)

        # --- no write access for anon --------------------------------------
        status, err = as_role("anon", None,
            "insert into public.profiles (user_id, slug, display_name) values (%s, 'anon-try', 'Anon')", (OWNER,))
        check("anon cannot write", status == "error", err)

    print(f"\n{len(passed)} passed, {len(failed)} failed")
    if failed:
        print("failed: " + ", ".join(failed))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
