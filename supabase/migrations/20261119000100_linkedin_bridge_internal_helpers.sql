-- Keep the LinkedIn bridge's secret helpers internal.
--
-- 20261116000200_linkedin_editorial_bridge.sql runs `revoke all ... from public`
-- on linkedin_secret_matches and linkedin_caller_authorized and never grants
-- them, intending them to be callable only from the SECURITY DEFINER bridge
-- RPCs. Supabase's default privileges, however, grant EXECUTE on new functions
-- in `public` to anon and authenticated directly, so both were still reachable
-- at /rest/v1/rpc/* as a yes/no secret oracle (flagged by the security advisor).
--
-- The bridge RPCs run as the function owner, so revoking the API roles here
-- does not change their behaviour.
--
-- Idempotent: safe to re-run.

begin;

revoke execute on function public.linkedin_secret_matches(text) from anon, authenticated;
revoke execute on function public.linkedin_caller_authorized(text) from anon, authenticated;

commit;
