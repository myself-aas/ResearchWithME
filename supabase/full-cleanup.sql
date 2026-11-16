-- ============================================================================
-- FULL CLEANUP: Database + Storage
-- ============================================================================
-- Run this single script to clean everything:
--   1. All mock/test data from database tables
--   2. All objects from storage buckets (blog-images, profile-images)
--   3. Preserves: editor account, bucket configs, schema, RLS, functions
--
-- Usage:
--   supabase db query --file supabase/full-cleanup.sql --linked --yes
--   Or paste into Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- SAFETY: Preview what will be deleted (uncomment to preview)
-- ============================================================================

-- SELECT 'posts' as table, COUNT(*) as rows FROM public.posts
-- UNION ALL SELECT 'comments', COUNT(*) FROM public.comments
-- UNION ALL SELECT 'author_applications', COUNT(*) FROM public.author_applications
-- UNION ALL SELECT 'profiles (non-editor)', COUNT(*) FROM public.profiles p LEFT JOIN public.editors e ON e.user_id = p.user_id WHERE e.user_id IS NULL
-- UNION ALL SELECT 'billing_orders', COUNT(*) FROM public.billing_orders
-- UNION ALL SELECT 'billing_subscriptions', COUNT(*) FROM public.billing_subscriptions
-- UNION ALL SELECT 'billing_events', COUNT(*) FROM public.billing_events
-- UNION ALL SELECT 'billing_customers', COUNT(*) FROM public.billing_customers
-- UNION ALL SELECT 'api_keys', COUNT(*) FROM public.api_keys
-- UNION ALL SELECT 'api_requests', COUNT(*) FROM public.api_requests
-- UNION ALL SELECT 'api_usage_periods', COUNT(*) FROM public.api_usage_periods
-- UNION ALL SELECT 'linkedin_events', COUNT(*) FROM public.linkedin_events
-- UNION ALL SELECT 'linkedin_tokens', COUNT(*) FROM public.linkedin_tokens
-- UNION ALL SELECT 'storage.objects (blog-images)', COUNT(*) FROM storage.objects WHERE bucket_id = 'blog-images'
-- UNION ALL SELECT 'storage.objects (profile-images)', COUNT(*) FROM storage.objects WHERE bucket_id = 'profile-images';

-- ============================================================================
-- PART 1: DATABASE CLEANUP (idempotent - safe to run multiple times)
-- ============================================================================

BEGIN;

-- 1. Delete all comments
DELETE FROM public.comments;

-- 2. Delete all posts (articles/reviews)
DELETE FROM public.posts;

-- 3. Delete all author applications
DELETE FROM public.author_applications;

-- 4. Delete all profiles EXCEPT the editor (Ashif Ahmed Shuvo)
DELETE FROM public.profiles
WHERE user_id NOT IN (
    SELECT id FROM auth.users
    WHERE email IN ('ashif@researchwith.me', 'hello@researchwith.me')
);

-- 5. Delete billing data (if tables exist)
DO $$
BEGIN
    IF to_regclass('public.billing_orders') IS NOT NULL THEN
        DELETE FROM public.billing_orders;
    END IF;
    IF to_regclass('public.billing_subscriptions') IS NOT NULL THEN
        DELETE FROM public.billing_subscriptions;
    END IF;
    IF to_regclass('public.billing_events') IS NOT NULL THEN
        DELETE FROM public.billing_events;
    END IF;
    IF to_regclass('public.billing_customers') IS NOT NULL THEN
        DELETE FROM public.billing_customers;
    END IF;
END $$;

-- 6. Delete API keys and related data (if tables exist)
DO $$
BEGIN
    IF to_regclass('public.api_requests') IS NOT NULL THEN
        DELETE FROM public.api_requests;
    END IF;
    IF to_regclass('public.api_usage_periods') IS NOT NULL THEN
        DELETE FROM public.api_usage_periods;
    END IF;
    IF to_regclass('public.api_keys') IS NOT NULL THEN
        DELETE FROM public.api_keys;
    END IF;
END $$;

-- 7. Delete LinkedIn data (if tables exist)
DO $$
BEGIN
    IF to_regclass('public.linkedin_events') IS NOT NULL THEN
        DELETE FROM public.linkedin_events;
    END IF;
    IF to_regclass('public.linkedin_tokens') IS NOT NULL THEN
        DELETE FROM public.linkedin_tokens;
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- PART 2: STORAGE CLEANUP
-- ============================================================================
-- NOTE: Direct DELETE from storage.objects is blocked by Supabase.
-- Use one of these methods instead:
--   1. Node.js script: node supabase/clean-storage.mjs (requires SUPABASE_SERVICE_ROLE_KEY)
--   2. Supabase Dashboard: Storage → blog-images → Select all → Delete
--   3. Supabase Dashboard: Storage → profile-images → Select all → Delete
--
-- The SQL below only verifies bucket configs are preserved.

-- ============================================================================
-- PART 3: VERIFICATION
-- ============================================================================

-- Verify database tables are empty (except editors)
-- Uses DO blocks to handle tables that may not exist
DO $$
DECLARE
    t text;
    c bigint;
BEGIN
    FOR t, c IN
        SELECT 'posts', COUNT(*) FROM public.posts
        UNION ALL SELECT 'comments', COUNT(*) FROM public.comments
        UNION ALL SELECT 'author_applications', COUNT(*) FROM public.author_applications
        UNION ALL SELECT 'profiles', COUNT(*) FROM public.profiles
        UNION ALL SELECT 'editors', COUNT(*) FROM public.editors
    LOOP
        RAISE NOTICE '%: % rows', t, c;
    END LOOP;

    -- Optional tables (may not exist)
    IF to_regclass('public.billing_orders') IS NOT NULL THEN
        SELECT COUNT(*) INTO c FROM public.billing_orders;
        RAISE NOTICE 'billing_orders: % rows', c;
    END IF;
    IF to_regclass('public.billing_subscriptions') IS NOT NULL THEN
        SELECT COUNT(*) INTO c FROM public.billing_subscriptions;
        RAISE NOTICE 'billing_subscriptions: % rows', c;
    END IF;
    IF to_regclass('public.billing_events') IS NOT NULL THEN
        SELECT COUNT(*) INTO c FROM public.billing_events;
        RAISE NOTICE 'billing_events: % rows', c;
    END IF;
    IF to_regclass('public.billing_customers') IS NOT NULL THEN
        SELECT COUNT(*) INTO c FROM public.billing_customers;
        RAISE NOTICE 'billing_customers: % rows', c;
    END IF;
    IF to_regclass('public.api_keys') IS NOT NULL THEN
        SELECT COUNT(*) INTO c FROM public.api_keys;
        RAISE NOTICE 'api_keys: % rows', c;
    END IF;
    IF to_regclass('public.api_requests') IS NOT NULL THEN
        SELECT COUNT(*) INTO c FROM public.api_requests;
        RAISE NOTICE 'api_requests: % rows', c;
    END IF;
    IF to_regclass('public.api_usage_periods') IS NOT NULL THEN
        SELECT COUNT(*) INTO c FROM public.api_usage_periods;
        RAISE NOTICE 'api_usage_periods: % rows', c;
    END IF;
    IF to_regclass('public.linkedin_events') IS NOT NULL THEN
        SELECT COUNT(*) INTO c FROM public.linkedin_events;
        RAISE NOTICE 'linkedin_events: % rows', c;
    END IF;
    IF to_regclass('public.linkedin_tokens') IS NOT NULL THEN
        SELECT COUNT(*) INTO c FROM public.linkedin_tokens;
        RAISE NOTICE 'linkedin_tokens: % rows', c;
    END IF;
END $$;

-- Verify editor is preserved
SELECT e.user_id, e.note, e.added_at, u.email
FROM public.editors e
JOIN auth.users u ON u.id = e.user_id;

-- Verify storage bucket configurations are preserved
SELECT
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
WHERE id IN ('blog-images', 'profile-images');

-- Storage object counts (run separately via Dashboard or Node.js script)
-- SELECT bucket_id, COUNT(*) FROM storage.objects WHERE bucket_id IN ('blog-images', 'profile-images') GROUP BY bucket_id;

-- ============================================================================
-- PART 4: RE-CREATE EDITOR IF ACCIDENTALLY DELETED (safety net)
-- ============================================================================
-- Uncomment and run ONLY if the editor row was lost:
--
-- INSERT INTO public.editors (user_id, role, display_name, note)
-- SELECT id, 'editor-in-chief', 'Ashif Ahmed Shuvo', 'Restored after cleanup'
-- FROM auth.users
-- WHERE email IN ('ashif@researchwith.me', 'hello@researchwith.me')
-- ON CONFLICT (user_id) DO NOTHING;