-- The publication no longer sells products. Preserve applied migration history
-- and transaction records, but remove all runtime billing entry points.
-- This migration intentionally does not drop order/customer/subscription/event
-- tables: retention or erasure of historical financial records is a separate,
-- owner-reviewed operation. No application role can read or mutate them now.
begin;

drop function if exists public.apply_billing_event(text, text, text, jsonb);
drop function if exists public.billing_secret_matches(text);
drop table if exists private.billing_settings;

revoke all privileges on table public.billing_customers,
  public.billing_orders, public.billing_subscriptions, public.billing_events
  from public, anon, authenticated, service_role;
revoke all privileges on sequence public.billing_orders_id_seq,
  public.billing_subscriptions_id_seq from public, anon, authenticated, service_role;

drop policy if exists "Customers can read their own billing record" on public.billing_customers;
drop policy if exists "Customers can read their own orders" on public.billing_orders;
drop policy if exists "Customers can read their own subscription" on public.billing_subscriptions;

-- RLS remains enabled on archived tables, with no application policies.
commit;
