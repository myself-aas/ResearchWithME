import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const file = path.join(process.cwd(), 'supabase/migrations/20261114000200_api_keys.sql');
const sql = () => readFileSync(file, 'utf8');
const count = (text: string, needle: string) => text.split(needle).length - 1;

describe('api keys migration', () => {
  it('creates the three tables idempotently with row-level security', () => {
    const text = sql();
    for (const table of ['api_keys', 'api_requests', 'api_usage_periods']) {
      expect(text).toContain(`create table if not exists public.${table}`);
      expect(text).toContain(`alter table public.${table} enable row level security`);
    }
  });
  it('pins the search path on every function', () => {
    const text = sql();
    const functions = count(text, 'create or replace function');
    expect(functions).toBe(7);
    expect(count(text, "set search_path = ''")).toBe(functions);
  });
  it('gates every bridge function on the secret', () => {
    expect(count(sql(), 'if not public.billing_secret_matches(p_bridge_secret) then')).toBe(5);
  });
  it('never lets a signed-in user read a key hash or write anything but a revocation', () => {
    const text = sql();
    expect(text).toContain('grant select (id, user_id, name, prefix, created_at, last_used_at, revoked_at) on public.api_keys to authenticated');
    expect(text).toContain('grant update (revoked_at) on public.api_keys to authenticated');
    expect(text).toContain('revoke all on public.api_requests from anon, authenticated');
    expect(text).toContain('revoke all on public.api_usage_periods from anon, authenticated');
  });
  it('does not introduce a service-role path', () => {
    expect(sql()).not.toContain('service_role');
  });
  it('is re-runnable', () => {
    const text = sql();
    expect(count(text, 'drop policy if exists')).toBe(count(text, 'create policy'));
    expect(count(text, 'drop trigger if exists')).toBe(count(text, 'create trigger'));
  });
});
